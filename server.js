const axios = require('axios');
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();
const port = 3000;

app.use(cors({
  origin: '*',
}));

app.get('/api/v1/search/shop.json', async (req, res) => { // <-- Here add async
  const { id } = req.params;
  try {
    const { data } = await axios.get(`https://search.shopping.naver.com/product/${id}`);
    // 원하는 데이터를 추출합니다.
    const popularDegree = extractPopularDegree(data);
    res.json({ popularDegree });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function extractPopularDegree(html) {
  const $ = cheerio.load(html);

  // 해당 상품 페이지에서 __NEXT_DATA__ 스크립트 태그를 찾아 JSON 파싱
  const scriptTag = $('#__NEXT_DATA__');
  const jsonData = JSON.parse(scriptTag.html());

  // popularDegree 값 반환
  if (jsonData && jsonData.props && jsonData.props.pageProps && jsonData.props.pageProps.product) {
    return jsonData.props.pageProps.product.popularDegree;
  } else {
    console.error('Invalid JSON data:', jsonData);
    return null;
  }  
}
