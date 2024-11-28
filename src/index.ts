import axios from 'axios';
import pdf from 'pdf-parse';

interface DailyMenu {
  date: string;
  조식: string[];
  중식: {
    A코너: string[];
    B코너: string[];
    셀프코너: string[];
  };
  석식: string[];
}

async function downloadPdf(url: string): Promise<Buffer> {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data);
}

async function parseMealPdf(url: string): Promise<DailyMenu[]> {
  try {
    const pdfBuffer = await downloadPdf(url);
    const data = await pdf(pdfBuffer);
    
    // 실제 메뉴 데이터만 추출
    const menuLines = data.text.split('\n')
      .map(line => line.trim())
      .filter(line => line && 
        !line.includes('식') && 
        !line.includes('코너') && 
        !line.includes('Take Out') &&
        !line.includes('~') &&
        !line.includes('※') &&
        !line.includes('--') &&
        !line.includes('판교세븐'));

    // 날짜 파싱
    const dates = menuLines[0]
    .match(/\d+월 \d+일\([월화수목금토일]\)/g) ?? [];
    console.log(dates);
    const menus: DailyMenu[] = dates.map(date => ({
      date,
      조식: [],
      중식: {
        A코너: [],
        B코너: [],
        셀프코너: []
      },
      석식: []
    }));

    // 조식 메뉴 (1-6줄)
    for (let i = 1; i <= 6; i++) {
      const menuItems = menuLines[i].split(/\s{2,}/);
      menuItems.forEach((menu, index) => {
        if (index < 5 && menu.trim()) {
          menus[index].조식.push(menu.trim());
        }
      });
    }

    // 중식 A코너 (7-11줄)
    for (let i = 7; i <= 10; i++) {
      const menuItems = menuLines[i].split(/\s{2,}/);
      menuItems.forEach((menu, index) => {
        if (index < 5 && menu.trim()) {
          menus[index].중식.A코너.push(menu.trim());
        }
      });
    }

    // 중식 B코너 (12-16줄)
    for (let i = 11; i <= 14; i++) {
      const menuItems = menuLines[i].split(/\s{2,}/);
      menuItems.forEach((menu, index) => {
        if (index < 5 && menu.trim()) {
          menus[index].중식.B코너.push(menu.trim());
        }
      });
    }

    // 셀프코너 (17-18줄)
    for (let i = 15; i <= 19; i++) {
      const menuItems = menuLines[i].split(/\s{2,}/);
      menuItems.forEach((menu, index) => {
        if (index < 5 && menu.trim()) {
          menus[index].중식.셀프코너.push(menu.trim());
        }
      });
    }

    // 석식 메뉴 (19-24줄)
    for (let i = 20; i <= 25; i++) {
      const menuItems = menuLines[i].split(/\s{2,}/);
      menuItems.forEach((menu, index) => {
        if (index < 5 && menu.trim()) {
          menus[index].석식.push(menu.trim());
        }
      });
    }

    return menus;
  } catch (error) {
    console.error('PDF 처리 중 오류 발생:', error);
    throw error;
  }
}

function displayMenu(menus: DailyMenu[]): void {
  menus.forEach(menu => {
    console.log(`\n[${menu.date}]`);
    
    console.log('\n[조식]');
    menu.조식.forEach(item => console.log(`- ${item}`));
    
    console.log('\n[중식]');
    console.log('A코너:');
    menu.중식.A코너.forEach(item => console.log(`- ${item}`));
    console.log('B코너:');
    menu.중식.B코너.forEach(item => console.log(`- ${item}`));
    console.log('셀프코너:');
    menu.중식.셀프코너.forEach(item => console.log(`- ${item}`));
    
    console.log('\n[석식]');
    menu.석식.forEach(item => console.log(`- ${item}`));
  });
}

// 사용 예시
const pdfUrl = "http://pvv.co.kr/bbs/download.php?bbsMode=fileDown&code=bbs_menu01&id=740&filename=%C6%C7%B1%B311%BF%F91%C1%D6%C2%F7.pdf";

parseMealPdf(pdfUrl)
  .then(menus => {
    displayMenu(menus);
  })
  .catch(error => {
    console.error('에러가 발생했습니다:', error);
  });
