const axios = require('axios');
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();

app.use(cors({
  origin: '*',
}));

app.get('/product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data } = await axios.get(`https://search.shopping.naver.com/product/${id}`);
    const { mallPid } = extractData(data);
    res.json({ mallPid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

function extractData(html) {
  const $ = cheerio.load(html);
  const scriptTag = $('#__NEXT_DATA__');
  const jsonData = JSON.parse(scriptTag.html());

  let mallPid = null;

  if (jsonData && jsonData.props && jsonData.props.pageProps && jsonData.props.pageProps.product) {
    mallPid = jsonData.props.pageProps.product.mallPid;
  } else {
    console.error('Invalid JSON data:', jsonData);
  }

  return { mallPid };
}
