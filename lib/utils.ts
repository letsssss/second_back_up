export function cn(...inputs: (string | undefined | null)[]): string {
  return inputs.filter(Boolean).join(" ")
}

/**
 * BigInt 값을 포함한 객체를 JSON으로 직렬화 가능한 형태로 변환합니다.
 * BigInt 값은 문자열로 변환됩니다.
 * 
 * @param obj 변환할 객체
 * @returns BigInt 값이 문자열로 변환된 객체
 */
export function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item));
  }
  
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertBigIntToString(obj[key]);
    }
    return newObj;
  }
  
  return obj;
}

/**
 * BigInt 값을 처리할 수 있는 사용자 정의 JSON 직렬화 메서드입니다.
 * 
 * @param obj 직렬화할 객체
 * @returns 직렬화된 JSON 문자열
 */
export function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
}

/**
 * 12자리 랜덤 숫자 ID를 생성합니다.
 * 
 * @returns 12자리 숫자 문자열
 */
export function generateRandom12DigitId(): string {
  // 12자리 숫자가 필요하므로 10^11 ~ 10^12-1 사이의 숫자 생성
  const min = 100000000000; // 10^11
  const max = 999999999999; // 10^12-1
  return Math.floor(min + Math.random() * (max - min)).toString();
}

/**
 * 중복되지 않는 12자리 랜덤 숫자 ID를 생성합니다.
 * 
 * @param prisma Prisma 클라이언트 인스턴스
 * @param maxAttempts 최대 시도 횟수 (기본값: 5)
 * @returns 중복되지 않는 12자리 ID
 */
export async function generateUniquePostId(prisma: any, maxAttempts: number = 5): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const id = generateRandom12DigitId();
    
    // 이미 존재하는 ID인지 확인
    const existingPost = await prisma.post.findUnique({
      where: { id: id }
    });
    
    if (!existingPost) {
      return id; // 중복되지 않는 ID 발견
    }
    
    attempts++;
  }
  
  // 최대 시도 횟수 초과 시 에러 발생
  throw new Error('고유한 ID 생성에 실패했습니다. 나중에 다시 시도해주세요.');
}

