const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/social-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
  
const userSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

app.post('/users/register', async (req, res) => {
  const { userName, email, password } = req.body;

  if (!userName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ userName, email, password: hashedPassword });
  await newUser.save();

  res.json({ message: 'User registered successfully.' });
});

app.post('/users/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  const randomString = crypto.randomBytes(8).toString('hex');
  const apiKey = `mern-${user._id}-${email}-${randomString}`;

  res.json({ apiKey });
});

app.post('/posts', async (req, res) => {
  const { apiKey } = req.query;
  const { content } = req.body;

  if (!apiKey || !content) {
    return res.status(400).json({ error: 'apiKey and content are required.' });
  }

  const [prefix, userId, email, randomString] = apiKey.split('-');
  if (prefix !== 'mern') {
    return res.status(400).json({ error: 'Invalid apiKey.' });
  }

  const user = await User.findById(userId);
  if (!user || user.email !== email) {
    return res.status(400).json({ error: 'Invalid apiKey or unauthorized user.' });
  }

  const newPost = new Post({ userId, content, createdAt: new Date(), updatedAt: new Date() });
  await newPost.save();

  res.json({ message: 'Post created successfully.', postId: newPost._id });
});

app.put('/posts/:id', async (req, res) => {
  const { apiKey } = req.query;
  const { id } = req.params;
  const { content } = req.body;

  if (!apiKey || !content) {
    return res.status(400).json({ error: 'apiKey and content are required.' });
  }

  const [prefix, userId, email, randomString] = apiKey.split('-');
  if (prefix !== 'mern') {
    return res.status(400).json({ error: 'Invalid apiKey.' });
  }

  const user = await User.findById(userId);
  if (!user || user.email !== email) {
    return res.status(400).json({ error: 'Invalid apiKey or unauthorized user.' });
  }

  const post = await Post.findById(id);
  if (!post || post.userId.toString() !== userId) {
    return res.status(404).json({ error: 'Post not found or unauthorized user.' });
  }

  post.content = content;
  post.updatedAt = new Date();
  await post.save();

  res.json({ message: 'Post updated successfully.' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
