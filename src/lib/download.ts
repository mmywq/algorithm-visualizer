/** Сохраняет текст в файл через временную ссылку с атрибутом download. */
export const downloadText = (fileName: string, content: string, type: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // ссылку освобождаем не сразу: некоторые браузеры начинают загрузку после клика асинхронно
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
