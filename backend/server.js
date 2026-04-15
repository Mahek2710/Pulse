const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/intake', require('./routes/intake'));
app.use('/api/healthtwin', require('./routes/healthtwin'));
app.use('/api/doctor', require('./routes/doctor'));

 
app.get('/', (req, res) => res.json({ message: 'Pulse API running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));