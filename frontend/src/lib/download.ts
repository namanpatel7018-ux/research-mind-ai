/**
 * Triggers a client-side file download for a Blob with proper MIME type,
 * guaranteed filename extension (e.g. .pptx, .pdf), and delayed URL cleanup
 * so Chromium / WebKit download engines have time to read the download attribute.
 */
export function downloadBlob(blob: Blob, filename: string, mimeType?: string): void {
  let resolvedType = mimeType;
  if (!resolvedType) {
    if (filename.toLowerCase().endsWith('.pptx')) {
      resolvedType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (filename.toLowerCase().endsWith('.pdf')) {
      resolvedType = 'application/pdf';
    } else {
      resolvedType = blob.type || 'application/octet-stream';
    }
  }

  // Ensure filename has proper extension if omitted
  let finalFilename = filename;
  if (resolvedType.includes('presentationml') && !finalFilename.toLowerCase().endsWith('.pptx')) {
    finalFilename += '.pptx';
  } else if (resolvedType.includes('pdf') && !finalFilename.toLowerCase().endsWith('.pdf')) {
    finalFilename += '.pdf';
  }

  // Create an explicitly typed Blob
  const typedBlob = new Blob([blob], { type: resolvedType });
  const objectUrl = window.URL.createObjectURL(typedBlob);

  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = objectUrl;
  link.download = finalFilename;
  link.setAttribute('download', finalFilename);

  document.body.appendChild(link);
  link.click();

  // IMPORTANT: Delay revoking the object URL and removing the link element.
  // In Chromium, synchronous revocation causes the browser's download manager
  // to lose the download attribute metadata and save the file with the internal blob UUID without extension.
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(objectUrl);
    } catch {}
  }, 10000);
}
