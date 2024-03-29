const axios = require('axios');
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();
const url = require('url');
const puppeteer = require('puppeteer');

app.use(cors({ origin: '*' }));

const Headers1 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Referrer': 'https://search.shopping.naver.com/',
};
const Headers2 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Referrer': 'https://smartstore.naver.com/',
};

async function fetchDynamicContent(url) {
  let browser = await puppeteer.launch();
  let page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });
  let content = await page.content();
  await browser.close();
  return content;
}

// 네이버 쇼핑 상품 페이지에서 mallPid 추출
app.get('/product/:id', async (req, res) => {
  let { id } = req.params;
  try {
    let { data } = await axios.get(`https://search.shopping.naver.com/product/${id}`, { headers: Headers1 });
    let html = await fetchDynamicContent(url);
    let { SV1, SV2, SV3, SV4, SV5, SV6 } = extractData(data);
    res.json({ SV1, SV2, SV3, SV4, SV5, SV6 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

function extractData(html) {
  let $ = cheerio.load(html);
  let scriptTag = $('#__NEXT_DATA__');
  let jsonData = JSON.parse(scriptTag.html());

  let SV1 = null;
  let SV2 = null;
  let SV3 = null;
  let SV4 = null;
  let SV5 = null;
  let SV6 = null;

  if (jsonData && jsonData.props && jsonData.props.pageProps && jsonData.props.pageProps.product) {
    let productData = jsonData.props.pageProps.product;
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
  let { productid } = req.params;
  try {
    // Axios 요청
    let { data } = await axios.get(`https://smartstore.naver.com/main/products/${productid}`, {
      headers: Headers2,
    });
    let html = await fetchDynamicContent(url);
    let { nvMid } = extractMid(data);
    res.json({ nvMid });
    
    // 응답
    res.json({ nvMid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

function extractMid(html) {
  let $ = cheerio.load(html);
  let scriptContent = $('body > script:nth-child(2)').html();
  let jsonData = JSON.parse(scriptTag.html());

  let nvMid = null;
  let match = scriptContent.match(/"syncNvMid"\s*:\s*(\d+)/);
  if (match && match[1]) {
    nvMid = match[1];
  }
  return nvMid; // 객체 형태가 아닌 단일 값으로 반환
}

// 상품 지수에 대한 데이터 JSON 추출
app.post('/api/search', express.json(), async (req, res) => {
  let { keyword } = req.body;
  try {
    let localServerResponse = await axios.get(`http://218.38.65.91:3000/score?keyword=${encodeURIComponent(keyword)}`);
    let data = localServerResponse.data;
    res.json(data);
  } catch (error) {
    console.error('데이터를 가져오는 중 오류: ', error);
    res.status(500).json({ error: error.message });
  }
});

// 쇼핑 인기도키워드 순위 조회
app.get('/rankup', async (req, res) => {
  try {
    // query parameter 'period' Data Read (default: P1D)
    let period = req.query.period || 'P1D';
    let url = `https://search.shopping.naver.com/best/category/keyword?categoryCategoryId=ALL&categoryChildCategoryId=&categoryDemo=A00&categoryMidCategoryId=&categoryRootCategoryId=ALL&chartRank=1&period=${period}`;
    let { data } = await axios.get(url, { headers: Headers1 });
    let $ = cheerio.load(data);
    let scrapedData = [];

    $('.chartList_item_keyword__m_koH').each((index, element) => {
      let rank = $(element).find('.chartList_rank__ZTvTo').text();
      let status = $(element).find('.chartList_status__YiyMu').text();
      let keyword = $(element).text().replace(rank, '').replace(status, '').trim();

      // "상품" 뒤에 오는 모든 문자열 제거
      let productStringIndex = keyword.indexOf('상품');
      if (productStringIndex !== -1) {
        keyword = keyword.substring(0, productStringIndex).trim();
      }
      
      scrapedData.push({ rank, status, keyword });
    });

    res.json(scrapedData);
  } catch (error) {
    res.status(500).send('Error occurred while scraping data');
  }
});

// 인기 브랜드 순위 조회
app.get('/brandrank', async (req, res) => {
  try {
    // query parameter 'period' Data Read (default: P1D)
    let period = req.query.period || 'P1D';
    let url = `https://search.shopping.naver.com/best/category/brand?categoryCategoryId=ALL&categoryChildCategoryId=&categoryDemo=A00&categoryMidCategoryId=&categoryRootCategoryId=ALL&chartRank=1&period=${period}`;
    
    let { data } = await axios.get(url, { headers: Headers1 });
    let $ = cheerio.load(data);
    let scrapedData = [];

    $('.chartList_item_keyword__m_koH').each((index, element) => {
      let rank = $(element).find('.chartList_rank__ZTvTo').text();
      let status = $(element).find('.chartList_status__YiyMu').text();
      let keyword = $(element).text().replace(rank, '').replace(status, '').trim();

      // "상품" 뒤에 오는 모든 문자열 제거
      let productStringIndex = keyword.indexOf('상품');
      if (productStringIndex !== -1) {
        keyword = keyword.substring(0, productStringIndex).trim();
      }
      
      scrapedData.push({ rank, status, keyword });
    });

    res.json(scrapedData);
  } catch (error) {
    res.status(500).send('Error occurred while scraping data');
  }
});

// 많이 구매한 상품 순위 조회
app.get('/sellrank', async (req, res) => {
  try {
    let { data } = await axios.get('https://search.shopping.naver.com/best/category/purchase?categoryCategoryId=ALL&categoryChildCategoryId=&categoryDemo=A00&categoryMidCategoryId=&categoryRootCategoryId=ALL&period=P1D', { headers: Headers1 });
    let $ = cheerio.load(data);
    let scrapedData = [];

    $('.imageProduct_item__KZB_F').each((index, element) => {
      let rank = $(element).find('.imageProduct_rank__lEppJ').text();
      // 이미지 URL 추출 부분
      let imageElement = $(element).find('img');
      let imageUrl = imageElement.attr('src');
      
      // 상품명, 가격 등 나머지 정보 추출 부분
      let title = $(element).find('.imageProduct_title__Wdeb1').text();
      let price = $(element).find('.imageProduct_price__W6pU1').text();
      let deliveryFee = $(element).find('.imageProduct_delivery_fee__a2zzJ').text();
      let benefit = $(element).find('.imageProduct_benefit__y9I4_').text();
      let storeName = $(element).find('.imageProduct_mall__tJkQR').text();
      let linkElement = $(element).find('.imageProduct_link_item__1NP7w');
      let link = linkElement.attr('href');
      let nvMid = linkElement.data('i');
      let parsedUrl = new URL(link, 'https://search.shopping.naver.com');
      let catId = parsedUrl.searchParams.get('catId');

      // 가격비교 정보 추출 부분
      let compareLink = $(element).find('.imageProduct_btn_store__bL4eB').attr('href');
      let compareNumber = $(element).find('.imageProduct_btn_store__bL4eB em').text();

      // 추출한 정보를 객체에 저장
      scrapedData.push({
        rank,
        imageUrl,
        title,
        price: price.replace('원', '').trim(),
        deliveryFee: deliveryFee.includes('배송비') ? deliveryFee.replace('배송비', '').trim() : null,
        benefit: benefit ? benefit.trim() : null,
        storeName: storeName.trim(),
        link,
        nvMid,
        catId,
        compareLink: compareLink || null,
        compareNumber: compareNumber ? compareNumber.replace(/[^\d]/g, '') : null // 숫자만 추출
      });
    });

    // JSON 형태로 클라이언트에게 데이터 응답
    res.json(scrapedData);
  } catch (error) {
    // 에러 처리
    console.error(error);
    res.status(500).send('Error occurred while scraping data');
  }
});

let port = 3000;
app.listen(port, () => console.log(`서버 PORT: ${port}`));
