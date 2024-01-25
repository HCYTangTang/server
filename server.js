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
    const { SV1, SV2, SV3, SV4, SV5, SV6 } = extractData(data);
    res.json({ SV1, SV2, SV3, SV4, SV5, SV6 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
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
  let SV5 = null;
  let SV6 = null;

  if (jsonData && jsonData.props && jsonData.props.pageProps && jsonData.props.pageProps.product) {
    const productData = jsonData.props.pageProps.product;
    SV1 = productData.mallPid;
    SV2 = productData.nvMid;
    SV3 = productData.matchNvMid;
    SV4 = productData.itemType;
    SV5 = productData.productUrl;
    SV6 = productData.mallUrl;
  } else {
    console.error('Invalid JSON data:', jsonData);
  }
  return { SV1, SV2, SV3, SV4, SV5, SV6 };
}

// 네이버 스마트스토어 상품 페이지에서 nvMid 추출
app.get('/product2/:productid', async (req, res) => {
  const { productid } = req.params;
  try {
    const { data } = await axios.get(`https://smartstore.naver.com/main/products/${productid}`);
    const { nvMid } = extractMid(data);
    res.json({ nvMid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

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

// 상품 지수에 대한 데이터 JSON 추출
app.post('/api/search', express.json(), async (req, res) => {
  const { keyword } = req.body;
  try {
    const localServerResponse = await axios.get(`http://218.38.65.91:3000/score?keyword=${encodeURIComponent(keyword)}`);
    const data = localServerResponse.data;
    res.json(data);
  } catch (error) {
    console.error('데이터를 가져오는 중 오류: ', error);
    res.status(500).json({ error: error.message });
  }
});

// 쇼핑 인기도키워드 순위 조회
app.get('/rankup', async (req, res) => {
  try {
    const { data } = await axios.get('https://search.shopping.naver.com/best/category/keyword?categoryCategoryId=ALL&categoryDemo=A00&categoryRootCategoryId=ALL&chartRank=1&period=P1D');
    const $ = cheerio.load(data);
    const scrapedData = [];

    $('.chartList_item_keyword__m_koH').each((index, element) => {
      const rank = $(element).find('.chartList_rank__ZTvTo').text();
      const status = $(element).find('.chartList_status__YiyMu').text();
      const keyword = $(element).text().replace(rank, '').replace(status, '').trim();

      scrapedData.push({ rank, status, keyword });
    });

    res.json(scrapedData);
  } catch (error) {
    res.status(500).send('Error occurred while scraping data');
  }
});

const port = 3000;
app.listen(port, () => console.log(`서버 PORT: ${port}`));
