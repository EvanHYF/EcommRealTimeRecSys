const users = require('../models/userModel');

// Placeholder service methods
exports.getAllUsers = () => {
    return users;
};

exports.createUser = (user) => {
    users.push(user);
    return user;
};