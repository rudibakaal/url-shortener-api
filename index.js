require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const mySecret = process.env['MONGO_URI'];
const dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/index.html');
});

// Create a separate counter schema
const counterSchema = new mongoose.Schema({
  counter: { type: Number, default: 0 },
});

// Create a model for the counter
const CounterModel = mongoose.model('CounterModel', counterSchema);

// Create mongoose model
const UrlData = mongoose.model('myUrl', new mongoose.Schema({
  urlKey: { type: Number, default: 0 },
  url: String,
}));

// Configure middleware to parse data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.get('/api/shorturl/:key', async (req,res) => {
  const key = parseInt(req.params.key);
  
  if (typeof key === 'number' && !isNaN(key)) {
    let val = await UrlData.findOne({urlKey: key})
    if (val) {
      return res.redirect(val.url) 
    } else {
      return res.send({error: 'No short URL found for the given input'} 
)
    } 
  } 
  else {
    return res.send({error: 'wrong format'})
  }
})

app.post('/api/shorturl', async (req, res) => {

  try {
    // Parse incoming data from the request
    const { url } = req.body;

    // Extract host from URL
    const { hostname } = new URL(url);

    // Use dns.lookup to ensure the IP address of the host is valid
    dns.lookup(hostname, async (err, address) => {
      if (err) {
        return res.json({ error: 'Invalid URL' });
      }

      try {
        // Check if the document already exists for the given URL
        const existingUrlData = await UrlData.findOne({ url: url });

        if (existingUrlData) {
          // The document already exists, return the existing URL and urlKey
          return res.status(200).json({
            original_url: existingUrlData.url,
            short_url: existingUrlData.urlKey
          });
        }

        // Find and update the counter
        const counter = await CounterModel.findOneAndUpdate(
          {},
          { $inc: { counter: 1 } },
          { upsert: true, new: true }
        );

        // Form a new instance of the mongoose model 
        const urlData = new UrlData({
          urlKey: counter.counter,
          url,
        });

        // Save data to MongoDB
        await urlData.save();

        // Send success response
        res.status(200).json({
            original_url: urlData.url,
          short_url: urlData.urlKey
        });
      } catch (error) {
        // Handle errors
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  } catch (err) {
    // Handle errors
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



mongoose
  .connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(port, function() {
      console.log(`Listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });






