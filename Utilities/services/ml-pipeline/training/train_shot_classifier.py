"""
Training script for shot classification using LSTM
"""
import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import json
from pathlib import Path
from typing import List, Dict, Tuple


class ShotSequenceDataset(Dataset):
    """Dataset for shot classification sequences"""
    def __init__(self, sequences: np.ndarray, labels: np.ndarray):
        self.sequences = torch.FloatTensor(sequences)
        self.labels = torch.LongTensor(labels)
    
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        return self.sequences[idx], self.labels[idx]


class LSTMShotClassifier(nn.Module):
    """
    LSTM-based shot classifier using pose sequences
    Same as in enhanced_shot_classifier.py
    """
    def __init__(self, input_size=132, hidden_size=128, num_layers=2, num_classes=6):
        super(LSTMShotClassifier, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM for temporal pattern recognition
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        
        # Fully connected layers for classification
        self.fc1 = nn.Linear(hidden_size, 64)
        self.dropout = nn.Dropout(0.3)
        self.fc2 = nn.Linear(64, num_classes)
        self.relu = nn.ReLU()
        
    def forward(self, x):
        # x shape: (batch, sequence_length, features)
        lstm_out, _ = self.lstm(x)
        # Take the last output
        last_output = lstm_out[:, -1, :]
        x = self.relu(self.fc1(last_output))
        x = self.dropout(x)
        x = self.fc2(x)
        return x


def load_shot_data(data_dir: str) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Load shot classification data from JSON files
    
    Expected format:
    {
        "shot_id": 1,
        "shot_type": "forehand",
        "pose_sequence": [[...], [...], ...],  # 11 frames × 132 features
        "ball_trajectory": [...],
        "court_position": [x, y],
        "timestamp": 12.5
    }
    """
    data_path = Path(data_dir)
    json_files = list(data_path.glob('*.json'))
    
    if not json_files:
        raise ValueError(f"No JSON files found in {data_dir}")
    
    sequences = []
    labels = []
    shot_types = []
    
    for json_file in json_files:
        with open(json_file, 'r') as f:
            data = json.load(f)
            
            # Extract pose sequence
            pose_seq = np.array(data['pose_sequence'])
            
            # Ensure sequence length is 11 (pad or truncate)
            if len(pose_seq) < 11:
                # Pad with last frame
                last_frame = pose_seq[-1] if len(pose_seq) > 0 else np.zeros(132)
                while len(pose_seq) < 11:
                    pose_seq = np.vstack([pose_seq, last_frame])
            else:
                pose_seq = pose_seq[:11]
            
            # Ensure feature size is 132
            if pose_seq.shape[1] < 132:
                # Pad features
                padding = np.zeros((11, 132 - pose_seq.shape[1]))
                pose_seq = np.hstack([pose_seq, padding])
            elif pose_seq.shape[1] > 132:
                pose_seq = pose_seq[:, :132]
            
            sequences.append(pose_seq)
            labels.append(data['shot_type'])
            shot_types.append(data['shot_type'])
    
    sequences = np.array(sequences)
    
    # Encode labels
    label_encoder = LabelEncoder()
    encoded_labels = label_encoder.fit_transform(labels)
    
    return sequences, encoded_labels, label_encoder.classes_.tolist()


def train_shot_classifier(
    data_dir: str,
    epochs: int = 100,
    batch_size: int = 32,
    learning_rate: float = 0.001,
    hidden_size: int = 128,
    num_layers: int = 2,
    model_save_path: str = 'shot_classifier_lstm.pt'
):
    """
    Train LSTM model for shot classification
    
    Args:
        data_dir: Path to directory containing JSON annotation files
        epochs: Number of training epochs
        batch_size: Batch size for training
        learning_rate: Learning rate
        hidden_size: LSTM hidden size
        num_layers: Number of LSTM layers
        model_save_path: Path to save trained model
    """
    print("Loading data...")
    sequences, labels, class_names = load_shot_data(data_dir)
    
    print(f"Loaded {len(sequences)} shot sequences")
    print(f"Classes: {class_names}")
    print(f"Sequence shape: {sequences.shape}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        sequences, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    # Create datasets
    train_dataset = ShotSequenceDataset(X_train, y_train)
    test_dataset = ShotSequenceDataset(X_test, y_test)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    # Initialize model
    num_classes = len(class_names)
    model = LSTMShotClassifier(
        input_size=132,
        hidden_size=hidden_size,
        num_layers=num_layers,
        num_classes=num_classes
    )
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.5, patience=10, verbose=True
    )
    
    # Training loop
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    print(f"Using device: {device}")
    
    best_test_loss = float('inf')
    best_model_state = None
    
    print("\nStarting training...")
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for batch_X, batch_y in train_loader:
            batch_X = batch_X.to(device)
            batch_y = batch_y.to(device)
            
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            train_total += batch_y.size(0)
            train_correct += (predicted == batch_y).sum().item()
        
        # Validation
        model.eval()
        test_loss = 0.0
        test_correct = 0
        test_total = 0
        
        with torch.no_grad():
            for batch_X, batch_y in test_loader:
                batch_X = batch_X.to(device)
                batch_y = batch_y.to(device)
                
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                
                test_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                test_total += batch_y.size(0)
                test_correct += (predicted == batch_y).sum().item()
        
        train_acc = 100 * train_correct / train_total
        test_acc = 100 * test_correct / test_total
        avg_train_loss = train_loss / len(train_loader)
        avg_test_loss = test_loss / len(test_loader)
        
        scheduler.step(avg_test_loss)
        
        # Save best model
        if avg_test_loss < best_test_loss:
            best_test_loss = avg_test_loss
            best_model_state = model.state_dict().copy()
        
        if (epoch + 1) % 10 == 0 or epoch == 0:
            print(f"Epoch [{epoch+1}/{epochs}]")
            print(f"  Train Loss: {avg_train_loss:.4f}, Train Acc: {train_acc:.2f}%")
            print(f"  Test Loss: {avg_test_loss:.4f}, Test Acc: {test_acc:.2f}%")
    
    # Save best model
    if best_model_state:
        model.load_state_dict(best_model_state)
    
    torch.save({
        'model_state_dict': model.state_dict(),
        'class_names': class_names,
        'input_size': 132,
        'hidden_size': hidden_size,
        'num_layers': num_layers,
        'num_classes': num_classes
    }, model_save_path)
    
    print(f"\nTraining completed!")
    print(f"Best test accuracy: {test_acc:.2f}%")
    print(f"Model saved to: {model_save_path}")
    
    return model, class_names


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Train LSTM for shot classification')
    parser.add_argument('--data', type=str, required=True,
                       help='Path to directory containing JSON annotation files')
    parser.add_argument('--epochs', type=int, default=100,
                       help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                       help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001,
                       help='Learning rate')
    parser.add_argument('--hidden-size', type=int, default=128,
                       help='LSTM hidden size')
    parser.add_argument('--num-layers', type=int, default=2,
                       help='Number of LSTM layers')
    parser.add_argument('--save', type=str, default='shot_classifier_lstm.pt',
                       help='Path to save trained model')
    
    args = parser.parse_args()
    
    try:
        model, class_names = train_shot_classifier(
            data_dir=args.data,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr,
            hidden_size=args.hidden_size,
            num_layers=args.num_layers,
            model_save_path=args.save
        )
        print("\n✓ Training completed successfully!")
    except Exception as e:
        print(f"\n✗ Training failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)




