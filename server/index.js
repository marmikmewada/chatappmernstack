const express = require('express');
const fs = require('fs').promises; // Use the promises API
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server and initialize Socket.IO with CORS options
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

// Middleware to parse JSON bodies
app.use(cors());
app.use(express.json());

let chats = []; // In-memory store for chats

// Load users from users.json
const loadUsers = async () => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'users.json'));
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
};

// Save users to users.json
const saveUsers = async (users) => {
    await fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
    console.log('Users saved successfully');
};

// Load chats from chat.json
const loadChats = async () => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'chat.json'));
        chats = JSON.parse(data);
        console.log('Chats loaded successfully');
    } catch (error) {
        console.error('Error loading chats:', error);
    }
};

// Save chats to chat.json using a temporary file
const saveChats = async () => {
    const tempFilePath = path.join(__dirname, 'chat.temp.json');
    await fs.writeFile(tempFilePath, JSON.stringify(chats, null, 2));
    await fs.rename(tempFilePath, path.join(__dirname, 'chat.json'));
    console.log('Chats saved successfully');
};

// Load chats when the server starts
loadChats();

// Signup route
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const users = await loadUsers();

    if (users.find(user => user.username === username)) {
        console.warn('Signup failed: User already exists');
        return res.status(400).json({ message: 'User already exists' });
    }

    users.push({ username, password });
    await saveUsers(users);
    res.status(201).json({ message: 'User created successfully' });
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await loadUsers();

    const user = users.find(user => user.username === username && user.password === password);
    if (user) {
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
});

// Handle socket connection
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join', (username) => {
        socket.join(username);
        console.log(`${username} joined the chat`);
    });

    socket.on('sendMessage', async (data) => {
        const { sender, receiver, message } = data;

        chats.push({ sender, receiver, message, timestamp: new Date() });
        console.log(`Message sent from ${sender} to ${receiver}: ${message}`);

        // Save chats immediately
        await saveChats();

        socket.to(receiver).emit('receiveMessage', { sender, message, receiver, timestamp: new Date() });
        socket.emit('receiveMessage', { sender, message, receiver, timestamp: new Date() });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Get chat messages between two users
app.get('/chat', async (req, res) => {
    const { user1, user2 } = req.query;
    const filteredChats = chats.filter(chat =>
        (chat.sender === user1 && chat.receiver === user2) ||
        (chat.sender === user2 && chat.receiver === user1)
    );

    res.status(200).json(filteredChats);
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
