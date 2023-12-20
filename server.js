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
  try {
    const $ = cheerio.load(html);
    const scriptTag = $('#__NEXT_DATA__');
    if (!scriptTag || !scriptTag.html()) {
      throw new Error('NEXT 데이터가 없음');
    }
    const jsonData = JSON.parse(scriptTag.html());
    if (!jsonData || !jsonData.props || !jsonData.props.pageProps || !jsonData.props.pageProps.product) {
      console.error('유효하지 않은 JSON 정보:', jsonData);
      return null;
    }
    
    const productData = jsonData.props.pageProps.product;
    return {
      SV1: productData.mallPid,
      SV2: productData.nvMid,
      SV3: productData.matchNvMid,
      SV4: productData.itemType,
      SV5: productData.productUrl,
      SV6: productData.mallUrl
    };
  } catch (error) {
    console.error('JSON 파싱 오류:', error);
    return null; // 또는 오류를 나타내는 다른 적절한 값
  }
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

const port = 3000;
app.listen(port, () => console.log(`서버 PORT: ${port}`));
