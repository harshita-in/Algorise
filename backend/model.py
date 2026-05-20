import numpy as np
import torch
import torch.nn as nn

class SimpleMinMaxScaler:
    """
    Lightweight, self-contained MinMaxScaler to avoid dependencies on scikit-learn.
    """
    def __init__(self):
        self.min_val = 0.0
        self.max_val = 1.0

    def fit_transform(self, data):
        data_arr = np.array(data, dtype=np.float32)
        self.min_val = float(np.min(data_arr))
        self.max_val = float(np.max(data_arr))
        diff = self.max_val - self.min_val
        if diff == 0:
            return np.zeros_like(data_arr)
        return (data_arr - self.min_val) / diff

    def transform(self, data):
        data_arr = np.array(data, dtype=np.float32)
        diff = self.max_val - self.min_val
        if diff == 0:
            return np.zeros_like(data_arr)
        return (data_arr - self.min_val) / diff

    def inverse_transform(self, data):
        data_arr = np.array(data, dtype=np.float32)
        diff = self.max_val - self.min_val
        return data_arr * diff + self.min_val


class StockLSTM(nn.Module):
    """
    LSTM Neural Network for univariate time series stock prediction.
    """
    def __init__(self, input_size=1, hidden_layer_size=64, output_size=1, num_layers=2):
        super().__init__()
        self.hidden_layer_size = hidden_layer_size
        self.num_layers = num_layers
        
        # LSTM layer
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_layer_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0.0
        )
        # Fully connected layer
        self.linear = nn.Linear(hidden_layer_size, output_size)

    def forward(self, x):
        # x shape: (batch, seq_len, input_size)
        lstm_out, _ = self.lstm(x)
        # We only take the output of the last time step
        # lstm_out shape: (batch, seq_len, hidden_size)
        last_step_out = lstm_out[:, -1, :]
        predictions = self.linear(last_step_out)
        return predictions


def create_sequences(data, seq_length):
    """
    Prepares input-output sequence pairs for training.
    """
    xs, ys = [], []
    for i in range(len(data) - seq_length):
        x = data[i : (i + seq_length)]
        y = data[i + seq_length]
        xs.append(x)
        ys.append(y)
    return np.array(xs), np.array(ys)


def train_and_predict(prices, seq_length=15, predict_steps=12, epochs=40, epoch_callback=None):
    """
    Trains the LSTM model on historical prices and predicts future values.
    Returns: list of float (predicted prices)
    """
    # 1. Scale data
    scaler = SimpleMinMaxScaler()
    scaled_prices = scaler.fit_transform(prices)
    
    # 2. Check if we have enough data
    if len(scaled_prices) <= seq_length:
        # Fallback if too few data points: use smaller sequence length
        seq_length = max(3, len(scaled_prices) - 2)
        
    # 3. Create training sequences
    x_train_np, y_train_np = create_sequences(scaled_prices, seq_length)
    
    # Reshape to (samples, seq_len, features=1)
    x_train_np = x_train_np.reshape(-1, seq_length, 1)
    y_train_np = y_train_np.reshape(-1, 1)
    
    # Convert to PyTorch tensors
    x_train = torch.tensor(x_train_np, dtype=torch.float32)
    y_train = torch.tensor(y_train_np, dtype=torch.float32)
    
    # 4. Instantiate Model
    model = StockLSTM(input_size=1, hidden_layer_size=48, output_size=1, num_layers=2)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    
    # 5. Training Loop
    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        outputs = model(x_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        optimizer.step()
        
        # Fire callback for training status if provided
        if epoch_callback and (epoch + 1) % 5 == 0:
            epoch_callback(epoch + 1, epochs, float(loss.item()))
            
    # 6. Autoregressive Prediction
    model.eval()
    predictions = []
    
    # Start with the last window of historical data
    current_seq = scaled_prices[-seq_length:].tolist()
    
    with torch.no_grad():
        for _ in range(predict_steps):
            # Prepare tensor input: shape (1, seq_length, 1)
            seq_tensor = torch.tensor([current_seq], dtype=torch.float32).reshape(1, seq_length, 1)
            pred = model(seq_tensor)
            pred_val = float(pred.item())
            
            # Record prediction
            predictions.append(pred_val)
            
            # Roll sequence window forward: append prediction, remove oldest
            current_seq.append(pred_val)
            current_seq.pop(0)
            
    # 7. Inverse scale predictions
    predicted_prices = scaler.inverse_transform(predictions)
    return [float(p) for p in predicted_prices]
