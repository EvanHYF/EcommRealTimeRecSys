const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});