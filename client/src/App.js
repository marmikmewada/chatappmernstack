import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import "./App.css"
const socket = io('http://localhost:3000');
// const socket = io.connect('http://localhost:3000');

const App = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [receiver, setReceiver] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on("receiveMessage", (data) => {
            console.log("Message received:", data);
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: data.sender, message: data.message, receiver: data.receiver },
            ]);
        });

        return () => {
            socket.off("receiveMessage");
        };
    }, []);

    const handleSignup = async (e) => {
        e.preventDefault();
        const response = await fetch('http://localhost:3000/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (response.ok) {
            alert('Signup successful! You can log in now.');
        } else {
            console.error('Signup error:', data.message);
            alert(data.message);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (response.ok) {
            setIsLoggedIn(true);
            socket.emit('join', username);
            console.log(`User ${username} logged in and joined the chat`);
        } else {
            console.error('Login error:', data.message);
            alert(data.message);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        socket.emit('sendMessage', { sender: username, receiver, message });
        setMessage('');
        console.log(`Message sent from ${username} to ${receiver}: ${message}`);
    };

    const loadMessages = async () => {
        if (receiver) {
            const response = await fetch(`http://localhost:3000/chat?user1=${username}&user2=${receiver}`);
            const data = await response.json();
            setMessages(data);
            console.log(`Loaded messages between ${username} and ${receiver}`);
        }
    };

    useEffect(() => {
        loadMessages();
    }, [receiver]);

    return (
        <div>
            {!isLoggedIn ? (
                <div>
                    <form onSubmit={handleSignup}>
                        <h2>Signup</h2>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit">Signup</button>
                    </form>
                    <form onSubmit={handleLogin}>
                        <h2>Login</h2>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit">Login</button>
                    </form>
                </div>
            ) : (
                <div>
                    <h1>Welcome, {username}!</h1>
                    <input
                        type="text"
                        placeholder="Receiver's Username"
                        value={receiver}
                        onChange={(e) => setReceiver(e.target.value)}
                    />
                    {receiver && (
                        <div>
                            <h2>Chat with {receiver}</h2>
                            <div>
                                {messages.map((msg, index) => (
                                    <div key={index}>
                                        <strong>{msg.sender}:</strong> {msg.message}
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={sendMessage}>
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                />
                                <button type="submit">Send</button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default App;
