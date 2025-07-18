import html2canvas from 'html2canvas';
import { format, parseISO } from 'date-fns';
import { safeJaLocale } from './localeSetup';

// タイピング結果を表示用文字列に変換する関数
const formatTypingResultForImage = (typingResult) => {
  if (!typingResult) return '記録なし';

  try {
    const parsed = JSON.parse(typingResult);
    const grade = parsed.grade;
    const data = parsed.data;

    if (!grade) return '記録なし';

    const isBasicGrade = ['12級', '11級', '10級'].includes(grade);

    if (isBasicGrade) {
      const charCount = data.basicData?.charCount || '';
      const accuracy = data.basicData?.accuracy || '';
      let result = `${grade}`;
      if (charCount) result += ` 入力文字数: ${charCount}文字`;
      if (accuracy) result += ` 正タイプ率: ${accuracy}`;
      return result;
    } else {
      const themes = data.advancedData || [];
      let result = `${grade}`;
      themes.forEach((theme, index) => {
        if (theme.theme || theme.level) {
          result += `<br/>テーマ${index + 1}: ${theme.theme || '?'} - ${theme.level || '?'}`;
        }
      });
      return result || `${grade}: 記録なし`;
    }
  } catch (e) {
    // 古い形式の場合はそのまま表示
    return typingResult;
  }
};

// 評価シート画像生成
export const generateEvaluationSheet = async (classRecord) => {
  return new Promise((resolve, reject) => {
    try {
      // 評価シートのHTMLを動的に作成
      const sheetHtml = createEvaluationSheetHtml(classRecord);

      // 一時的にDOMに追加
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '-9999px';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '1200px';  // A4縦向きの幅に合わせて調整
      tempContainer.style.height = 'auto';   // 高さは自動調整
      tempContainer.style.backgroundColor = 'white';
      tempContainer.innerHTML = sheetHtml;

      document.body.appendChild(tempContainer);

      // 実際のコンテンツの高さを測定
      const actualHeight = tempContainer.scrollHeight;
      const minHeight = 1650; // A4縦向きの最小高さを調整
      const finalHeight = Math.max(actualHeight, minHeight);

      // HTML2Canvasで画像化（A4縦向きサイズ）
      html2canvas(tempContainer, {
        width: 1200,
        height: finalHeight,
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        logging: false,
        allowTaint: true
      }).then(canvas => {
        // Blobとして返す
        canvas.toBlob((blob) => {
          document.body.removeChild(tempContainer);
          resolve(blob);
        }, 'image/png', 0.9);
      }).catch(error => {
        document.body.removeChild(tempContainer);
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

// 評価シートのHTMLテンプレート
const createEvaluationSheetHtml = (record) => {
  const formattedDate = format(parseISO(record.date), 'yyyy年MM月dd日', { locale: safeJaLocale });

  return `
    <div style="
      width: 1200px;
      min-height: 1650px;
      padding: 30px;
      font-family: 'Hiragino Sans', 'Yu Gothic', '游ゴシック', 'Meiryo', sans-serif;
      background-color: white;
      border: 2px solid #333;
      box-sizing: border-box;
      margin: 0;
    ">
      <!-- ヘッダー -->
      <div style="text-align: center; margin-bottom: 35px; border-bottom: 3px solid #333; padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 36px; color: #333; font-weight: bold;">授業評価シート</h1>
        <p style="margin: 15px 0 0 0; font-size: 20px; color: #666;">プログラミング教室</p>
      </div>
    
      <!-- 基本情報 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px;">
        <div style="border: 2px solid #ccc; padding: 18px; border-radius: 8px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: bold; color: #333; width: 90px; font-size: 18px;">生徒名:</span>
            <span style="font-size: 22px; color: #000; border-bottom: 2px solid #333; flex: 1; padding: 8px;">${record.studentName}</span>
          </div>
        </div>
        <div style="border: 2px solid #ccc; padding: 18px; border-radius: 8px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: bold; color: #333; width: 90px; font-size: 18px;">実施日:</span>
            <span style="font-size: 20px; color: #000; border-bottom: 2px solid #333; flex: 1; padding: 8px;">${formattedDate}</span>
          </div>
        </div>
      </div>
    
      <!-- 担当者情報 -->
      ${record.instructor ? `
      <div style="margin-bottom: 30px;">
        <div style="border: 2px solid #ccc; padding: 18px; border-radius: 8px;">
          <div style="display: flex; align-items: center;">
            <span style="font-weight: bold; color: #333; width: 90px; font-size: 18px;">担当者:</span>
            <span style="font-size: 20px; color: #000; border-bottom: 2px solid #333; flex: 1; padding: 8px;">${record.instructor}</span>
          </div>
        </div>
      </div>
      ` : ''}
    
      <!-- 授業内容 -->
      <div style="margin-bottom: 30px;">
        <h3 style="background-color: #e3f2fd; padding: 12px; margin: 0 0 18px 0; border-left: 6px solid #1976d2; font-size: 22px; color: #333;">授業内容</h3>
        <div style="border: 2px solid #ccc; padding: 18px; border-radius: 8px; min-height: 70px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: bold; color: #333; width: 110px; font-size: 18px;">授業範囲:</span>
            <span style="font-size: 20px; color: #000; flex: 1; line-height: 1.6;">${record.classRange}</span>
          </div>
        </div>
      </div>
    
      <!-- 学習成果 -->
      <div style="margin-bottom: 30px;">
        <h3 style="background-color: #e3f2fd; padding: 12px; margin: 0 0 18px 0; border-left: 6px solid #1976d2; font-size: 22px; color: #333;">学習成果</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="border: 2px solid #ccc; padding: 18px; border-radius: 8px;">
            <div style="font-weight: bold; color: #333; margin-bottom: 10px; font-size: 18px;">タイピング結果</div>
            <div style="font-size: 16px; color: #000; min-height: 60px; line-height: 1.6;">
              ${formatTypingResultForImage(record.typingResult)}
            </div>
          </div>
          <div style="border: 2px solid #ccc; padding: 18px; border-radius: 8px;">
            <div style="font-weight: bold; color: #333; margin-bottom: 10px; font-size: 18px;">書き取り練習結果</div>
            <div style="font-size: 16px; color: #000; min-height: 60px; line-height: 1.6;">
              ${record.writingResult || '記録なし'}
            </div>
          </div>
        </div>
      </div>
    
    <!-- コメント -->
    ${record.comment ? `
    <div style="margin-bottom: 30px;">
      <h3 style="background-color: #e8f5e8; padding: 12px; margin: 0 0 18px 0; border-left: 6px solid #4caf50; font-size: 22px; color: #333;">指導コメント</h3>
      <div style="border: 2px solid #ccc; padding: 18px; border-radius: 8px; min-height: 100px;">
        <div style="font-size: 16px; color: #000; line-height: 1.8;">
          ${record.comment.replace(/\n/g, '<br>')}
        </div>
      </div>
    </div>
    ` : ''}
    
      <!-- 次回予定 -->
      ${record.nextClassRange ? `
        <div style="margin-bottom: 15px;">
          <h3 style="background-color: #fff3e0; padding: 12px; margin: 0 0 18px 0; border-left: 6px solid #ff9800; font-size: 22px; color: #333;">次回の授業予定</h3>
          <div style="border: 2px solid #ccc; padding: 18px; border-radius: 8px;">
            <div style="font-size: 18px; color: #000; line-height: 1.6;">
              ${record.nextClassRange}
            </div>
          </div>
        </div>
      ` : ''}
    
      <!-- フッター -->
      <div style="text-align: center; margin-top: 35px; padding-top: 15px; border-top: 2px solid #ccc;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          生成日時: ${format(new Date(), 'yyyy年MM月dd日')}
        </p>
      </div>
    </div>
  `;
};

// PDFエクスポート（将来の拡張用）
export const generateEvaluationSheetPDF = async (classRecord) => {
  // jsPDFを使用したPDF生成
  // 現在は画像生成のみ実装
  throw new Error('PDF生成は未実装です');
};

// 複数の評価シートを一括生成
export const generateMultipleEvaluationSheets = async (classRecords) => {
  const results = [];

  for (const record of classRecords) {
    try {
      const blob = await generateEvaluationSheet(record);
      results.push({
        record,
        blob,
        filename: `評価シート_${record.studentName}_${format(parseISO(record.date), 'yyyyMMdd')}.png`
      });
    } catch (error) {
      console.error(`評価シート生成エラー (${record.studentName}):`, error);
      results.push({
        record,
        blob: null,
        error: error.message
      });
    }
  }

  return results;
}; 