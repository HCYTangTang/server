const axios = require('axios');
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();
const url = require('url');

// JSON 파싱사용
app.use(express.json());
// CORS 모든권한 부여여
app.use(cors({ origin: '*' }));

const Headers1 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referrer': 'https://search.shopping.naver.com/'
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
// 네이버 쇼핑 상품 페이지에서 mallPid 추출
app.get('/product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data } = await axios.get(`https://search.shopping.naver.com/product/${id}`, { headers: Headers1 });
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
    // Axios 요청
    const response = await axios.get(`https://smartstore.naver.com/main/products/${productid}`, {
      headers: Headers2,
      maxRedirects: 5 // 리디렉션 최대 횟수 설정
    });
    // HTML에서 nvMid 추출
    const nvMid = extractMid(response.data);
    // 응답
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

// 유입체크
app.post('/api/inflow', async (req, res) => {
  try {
    let { mallSeq } = req.body;
    // mallSeq 값을 콘솔로 출력하여 확인
    console.log('Received mallSeq:', mallSeq);
    let url = "https://hcenter.shopping.naver.com/brand/content";

    let headers = {
      'Content-Type': 'text/plain;charset=UTF-8',
      'User-Agent': 'Mozilla/5.0',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept': '*/*',
      'Origin': 'https://hcenter.shopping.naver.com',
    };

  let payload = {
      "operationName": "getProductSale",
      "query": `
          query getProductSale($queryRequest: StoreTrafficRequest) {
              productSales(queryRequest: $queryRequest) {
                  sales {
                      paymentAmount
                      paymentCount
                      purchaseConversionRate
                      __typename
                  }
                  visit {
                      click
                      __typename
                  }
              }
          }
      `,
      "variables": {
          "queryRequest": {
              "dateType": "Daily",
              "startDate": "2024-09-11",
              "endDate": "2024-09-11",
              "mallSequence": String(mallSeq),
              "pageable": {
                  "page": 1,
                  "size": 50
              },
              "sortBy": "PaymentAmount"
          }
      }
  };
    // API 요청
    let response = await axios.post(url, payload, { headers });
    res.json(response.data);
  } catch (error) {
    console.error('요청 실패:', error);
    res.status(500).json({ message: 'API 요청 중 오류발생' });
  }
});

// 상품 지수에 대한 데이터 JSON 추출
app.post('/api/search', express.json(), async (req, res) => {
  const { keyword } = req.body;
  try {
    const localServerResponse = await axios.get(`http://1.233.29.162:3000/score?keyword=${encodeURIComponent(keyword)}`);
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
    // query parameter 'period' Data Read (default: P1D)
    const period = req.query.period || 'P1D';
    const url = `https://search.shopping.naver.com/best/category/keyword?categoryCategoryId=ALL&categoryChildCategoryId=&categoryDemo=A00&categoryMidCategoryId=&categoryRootCategoryId=ALL&chartRank=1&period=${period}`;
    const { data } = await axios.get(url, { headers: Headers1 });
    const $ = cheerio.load(data);
    const scrapedData = [];
    $('.chartList_item_keyword__m_koH').each((index, element) => {
      const rank = $(element).find('.chartList_rank__ZTvTo').text();
      const status = $(element).find('.chartList_status__YiyMu').text();
      let keyword = $(element).text().replace(rank, '').replace(status, '').trim();
      // "상품" 뒤에 오는 모든 문자열 제거
      const productStringIndex = keyword.indexOf('상품');
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
    const period = req.query.period || 'P1D';
    const url = `https://search.shopping.naver.com/best/category/brand?categoryCategoryId=ALL&categoryChildCategoryId=&categoryDemo=A00&categoryMidCategoryId=&categoryRootCategoryId=ALL&chartRank=1&period=${period}`;
    
    const { data } = await axios.get(url, { headers: Headers1 });
    const $ = cheerio.load(data);
    const scrapedData = [];
    $('.chartList_item_keyword__m_koH').each((index, element) => {
      const rank = $(element).find('.chartList_rank__ZTvTo').text();
      const status = $(element).find('.chartList_status__YiyMu').text();
      let keyword = $(element).text().replace(rank, '').replace(status, '').trim();
      // "상품" 뒤에 오는 모든 문자열 제거
      const productStringIndex = keyword.indexOf('상품');
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
    const { data } = await axios.get('https://search.shopping.naver.com/best/category/purchase?categoryCategoryId=ALL&categoryChildCategoryId=&categoryDemo=A00&categoryMidCategoryId=&categoryRootCategoryId=ALL&period=P1D', { headers: Headers1 });
    const $ = cheerio.load(data);
    const scrapedData = [];
    $('.imageProduct_item__KZB_F').each((index, element) => {
      const rank = $(element).find('.imageProduct_rank__lEppJ').text();
      // 이미지 URL 추출 부분
      const imageElement = $(element).find('img');
      const imageUrl = imageElement.attr('src');
      
      // 상품명, 가격 등 나머지 정보 추출 부분
      const title = $(element).find('.imageProduct_title__Wdeb1').text();
      const price = $(element).find('.imageProduct_price__W6pU1').text();
      const deliveryFee = $(element).find('.imageProduct_delivery_fee__a2zzJ').text();
      const benefit = $(element).find('.imageProduct_benefit__y9I4_').text();
      const storeName = $(element).find('.imageProduct_mall__tJkQR').text();
      const linkElement = $(element).find('.imageProduct_link_item__1NP7w');
      const link = linkElement.attr('href');
      const nvMid = linkElement.data('i');
      const parsedUrl = new URL(link, 'https://search.shopping.naver.com');
      const catId = parsedUrl.searchParams.get('catId');
      // 가격비교 정보 추출 부분
      const compareLink = $(element).find('.imageProduct_btn_store__bL4eB').attr('href');
      const compareNumber = $(element).find('.imageProduct_btn_store__bL4eB em').text();
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

// mallSeq 추출
app.get('/get-mall-seq', async (req, res) => {
    const productUrl = 'https://smartstore.naver.com/main/products/5250558586';

    try {
        // Axios를 사용하여 HTML 데이터를 가져옵니다.
        const response = await axios.get(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
        });

        // Cheerio를 사용하여 HTML 파싱
        const $ = cheerio.load(response.data);

        // window.__PRELOADED_STATE__에서 mallSeq 추출
        const scriptContent = $('script').filter((i, el) => $(el).html().includes('window.__PRELOADED_STATE__')).html();
        const preloadedStateMatch = scriptContent.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});/);

        if (preloadedStateMatch) {
            const preloadedState = JSON.parse(preloadedStateMatch[1]);
            const mallSeq = preloadedState.smartStoreV2.channel.mallSeq;

            if (mallSeq) {
                console.log(`mallSeq: ${mallSeq}`);
                res.json({ mallSeq });
            } else {
                res.status(404).json({ error: 'mallSeq 값을 찾을 수 없습니다.' });
            }
        } else {
            res.status(404).json({ error: '__PRELOADED_STATE__ 데이터를 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error('데이터 요청 실패:', error);
        res.status(500).json({ error: '데이터 요청 중 오류가 발생했습니다.' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`서버 PORT: ${port}`));
