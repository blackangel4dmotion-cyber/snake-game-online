const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load env vars
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('Connected to MongoDB database.'))
        .catch(err => console.error('Error connecting to MongoDB:', err));
} else {
    console.error('MONGO_URI is not defined in .env file!');
}

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    wins: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

const registerUser = async (username, password) => {
    try {
        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password: hash });
        return user._id;
    } catch (err) {
        if (err.code === 11000) {
            throw new Error('Username already exists');
        }
        throw err;
    }
};

const loginUser = async (username, password) => {
    const user = await User.findOne({ username });
    if (!user) return null;
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
        return {
            id: user._id,
            username: user.username,
            wins: user.wins
        };
    }
    return null;
};

const incrementWins = async (username) => {
    const user = await User.findOneAndUpdate(
        { username },
        { $inc: { wins: 1 } },
        { new: true }
    );
    return user ? 1 : 0;
};

const getTopPlayers = async () => {
    const players = await User.find({ username: { $ne: 'admin' } })
        .sort({ wins: -1 })
        .limit(10)
        .select('username wins -_id');
    return players;
};

const getAllUsers = async () => {
    const users = await User.find()
        .sort({ _id: 1 })
        .select('username wins _id');
    
    return users.map(u => ({
        id: u._id,
        username: u.username,
        wins: u.wins
    }));
};

const deleteUser = async (username) => {
    const result = await User.deleteOne({ username });
    return result.deletedCount;
};

const resetPassword = async (username, newPassword) => {
    const hash = await bcrypt.hash(newPassword, 10);
    const result = await User.updateOne(
        { username },
        { $set: { password: hash } }
    );
    return result.modifiedCount;
};

const resetAllWins = async () => {
    const result = await User.updateMany({}, { $set: { wins: 0 } });
    return result.modifiedCount;
};

module.exports = {
    registerUser,
    loginUser,
    incrementWins,
    getTopPlayers,
    getAllUsers,
    deleteUser,
    resetPassword,
    resetAllWins
};
