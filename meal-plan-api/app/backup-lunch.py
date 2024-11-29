from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pdfplumber
from typing import List, Dict
import requests
from io import BytesIO
from fastapi.middleware.cors import CORSMiddleware
import re

app = FastAPI(title="급식 메뉴 API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MenuItem(BaseModel):
    date: str
    조식: List[str]
    중식: Dict[str, List[str]]
    석식: List[str]

def split_menu_items(line: str) -> List[str]:
    # 시간 표시(xx:xx), ~, 중 식 등 제거
    line = re.sub(r'\d{2}:\d{2}|~|중\s*식', '', line).strip()
    
    # 공백을 기준으로 메뉴 항목 분리
    items = line.strip().split()
    
    # 정확히 5개의 항목이 있는지 확인
    if len(items) != 5:
        return []
        
    return items

def process_menu_line(line: str, current_section: str, current_corner: str, menus: List[Dict], line_count: int) -> int:
    # 순수하게 섹션 표시나 코너 표시만 있는 줄은 건너뛰기
    if line.strip() in ['코너', '식', 'Take Out', '※']:
        return line_count
        
    # SALAD BOX 줄 이후부터 석식 시작
    if 'SALAD BOX' in line:
        current_section = '석식'
        return line_count
        
    if current_section == '중식':
        items = split_menu_items(line)
        if items:  # 정확히 5개 항목이 있는 경우만 처리
            for idx, menu in enumerate(items):
                if line_count < 4:  # A코너 (첫 4줄)
                    menus[idx]['중식']['A코너'].append(menu)
                elif line_count < 8:  # B코너 (다음 4줄)
                    menus[idx]['중식']['B코너'].append(menu)
            line_count += 1
            
    return line_count

@app.get("/menu", response_model=List[MenuItem])
async def get_menu(url: str):
    try:
        # PDF 다운로드
        print(f"Downloading PDF from URL: {url}")
        response = requests.get(url, verify=False)
        if response.status_code != 200:
            raise Exception(f"PDF 다운로드 실패: {response.status_code}")
        
        pdf_file = BytesIO(response.content)
        
        # PDF 파싱
        with pdfplumber.open(pdf_file) as pdf:
            if len(pdf.pages) == 0:
                raise Exception("PDF에 페이지가 없습니다.")
            
            page = pdf.pages[0]
            text = page.extract_text()
            if not text:
                raise Exception("PDF에서 텍스트를 추출할 수 없습니다.")
            
            print("\n=== 원본 PDF 텍스트 ===")
            print(text)
            print("=====================\n")
            
        # 텍스트를 줄 단위로 분리
        lines = text.split('\n')
        lines = [line.strip() for line in lines if line.strip()]
        
        print("\n=== 전체 라인 ===")
        for i, line in enumerate(lines):
            print(f"Line {i}: {line}")
        print("================\n")
        
        # 날짜 찾기 (모든 라인에서 검색)
        dates = []
        date_pattern = r'\d{1,2}월\s*\d{1,2}일\s*\([월화수목금]\)'
        
        for line in lines:
            found_dates = re.findall(date_pattern, line)
            if found_dates:
                dates.extend(found_dates)
                print(f"Found dates in line: {found_dates}")
        
        if not dates:
            # 날짜를 찾지 못한 경우, 현재 주의 날짜 생성
            from datetime import datetime, timedelta
            today = datetime.now()
            monday = today - timedelta(days=today.weekday())
            dates = []
            for i in range(5):  # 월~금
                day = monday + timedelta(days=i)
                weekday = ['월', '화', '수', '목', '금'][i]
                date_str = f"{day.month}월 {day.day}일({weekday})"
                dates.append(date_str)
        
        print(f"최종 날짜 목록: {dates}")
        
        # 메뉴 데이터 구조 초기화
        menus = []
        for date in dates:
            menus.append({
                "date": date,
                "조식": [],
                "중식": {
                    "A코너": [],
                    "B코너": [],
                    "셀프코너": []
                },
                "석식": []
            })

        # 필터링된 라인 얻기
        filtered_lines = []
        exclude_words = ['식단', '코너', 'Take Out', '※', '--', '판교세븐', '주간메뉴']
        for line in lines:
            if not any(word in line for word in exclude_words):
                filtered_lines.append(line)

        print("\n=== 필터링된 메뉴 라인 ===")
        for i, line in enumerate(filtered_lines):
            print(f"Line {i}: {line}")
        print("========================\n")

        # 메뉴 파싱을 위한 상태 변수들
        current_section = None
        current_corner = None
        
        # 메뉴 파싱
        line_count = 0
        for line in filtered_lines:
            if '셀프토스트' in line:
                current_section = '중식'
                line_count = 0
                continue
            
            if current_section == '중식':
                line_count = process_menu_line(line, current_section, current_corner, menus, line_count)
            
        print("\n=== 최종 메뉴 데이터 ===")
        print(menus)
        print("=======================\n")
        
        return menus
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
