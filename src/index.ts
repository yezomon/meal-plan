import axios from 'axios';
import pdf from 'pdf-parse';

// PDF 파일의 URL
const pdfUrl = 'http://www.pvv.co.kr/bbs/download.php?bbsMode=fileDown&code=bbs_menu01&id=737&filename=%C6%C7%B1%B310%BF%F93%C1%D6(1).pdf';//'https://example.com/path/to/diet-plan.pdf';

// PDF 파싱 함수
const parsePdfFromUrl = async (url: string) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const dataBuffer = Buffer.from(response.data);

        const pdfData = await pdf(dataBuffer);
        console.log(pdfData.text); // 파싱된 텍스트 출력
    } catch (error) {
        console.error('Error fetching or parsing PDF:', error);
    }
};

// 함수 호출
parsePdfFromUrl(pdfUrl);

// express
import express from 'express';

const app = express();
const port = 3000;

// API 엔드포인트
app.get('/diet-plan', async (req, res) => {
    try {
        const pdfText = await parsePdfFromUrl(pdfUrl);
        res.send(pdfText);
    } catch (error) {
        res.status(500).send('Error fetching PDF');
    }
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

