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
    const { SV1, SV2, SV3, SV4 } = extractData(data);
    res.json({ SV1, SV2, SV3, SV4 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '에러 발생원인' });
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
    res.status(500).json({ error: '에러 발생원인' });
  }
});

function extractData(html) {
  const $ = cheerio.load(html);
  const scriptTag = $('#__NEXT_DATA__');
  const jsonData = JSON.parse(scriptTag.html());

  let SV1 = null;
  let SV2 = null;
  let SV3 = null;
  let SV4 = null;
  
  if (jsonData && jsonData.props && jsonData.props.pageProps && jsonData.props.pageProps.product) {
    const productData = jsonData.props.pageProps.product;
    SV1 = productData.mallPid;
    SV2 = productData.nvMid;
    SV3 = productData.itemType;
    SV4 = productData.productUrl;
  } else {
    console.error('유효하지 않은 JSON 정보:', jsonData);
  }
  return { SV1, SV2, SV3, SV4 };
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
app.listen(port, () => console.log(`서버 PORT: ${port}`));
