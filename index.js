const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const childRoutes = require('./routes/childRoutes');
const activityRoutes = require('./routes/activityRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/children', childRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/mentor', require('./routes/mentorRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));



app.get('/', (req, res) => {
    res.json({ message: 'CareBridge API is running' });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
