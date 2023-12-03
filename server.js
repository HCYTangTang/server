const axios = require('axios');
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();

app.use(cors({ origin: '*' }));

// 네이버 쇼핑 상품 페이지에서 mallPid 추출
app.get('/product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data } = await axios.get(`https://search.shopping.naver.com/product/${id}`);
    const { mallPid } = extractMallPid(data);
    res.json({ mallPid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// 네이버 스마트스토어 상품 페이지에서 nvMid 추출
app.get('/product2/:productid', async (req, res) => {
  const { productid } = req.params;
  try {
    const { data } = await axios.get(`https://smartstore.naver.com/main/products/${productid}`);
    const { nvMid } = extractMid(data);
    res.json({ nvMid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

function extractMallPid(html) {
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

function extractMid(html) {
  const $ = cheerio.load(html);
  const scriptContent = $('body > script:nth-child(2)').html();

  let nvMid = null;
  const match = scriptContent.match(/"syncNvMid"\s*:\s*(\d+)/);
  if (match && match[1]) {
    nvMid = match[1];
  }
  return { nvMid };
}

const port = 3000;
app.listen(port, () => console.log(`Server open on port ${port}`));
