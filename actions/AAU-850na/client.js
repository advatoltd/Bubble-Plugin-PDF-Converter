function(properties, context) {

  var elementId   = properties.element_id;
  var filename    = properties.filename    || "document.pdf";
  var pageFormat  = properties.page_format  || "a4";
  var orientation = properties.orientation || "portrait";
  var scale       = properties.scale       || 2;
  var pdfAction   = properties.pdf_action  || "download";

  // --- Guard: jsPDF namespace differs by CDN version ---
  var jsPDF = (window.jspdf && window.jspdf.jsPDF)
              ? window.jspdf.jsPDF
              : window.jsPDF;

  if (!jsPDF) {
    context.reportDebugger("PDF Converter: jsPDF library not loaded.");
    return;
  }

  // --- Find element ---
  var el = document.getElementById(elementId);
  if (!el) {
    context.reportDebugger(
      "PDF Converter: no element found with ID '" + elementId + "'"
    );
    return;
  }

  // --- Capture element to canvas ---
  html2canvas(el, {
    scale:           scale,
    useCORS:         true,
    allowTaint:      false,
    logging:         false,
    backgroundColor: "#ffffff"
  }).then(function(canvas) {

    var imgData = canvas.toDataURL("image/jpeg", 0.97);

    var pdf = new jsPDF({
      orientation: orientation,
      unit:        "mm",
      format:      pageFormat
    });

    var pW    = pdf.internal.pageSize.getWidth();
    var pH    = pdf.internal.pageSize.getHeight();
    var ratio = Math.min(pW / canvas.width, pH / canvas.height);

    pdf.addImage(
      imgData, "JPEG",
      0, 0,
      canvas.width  * ratio,
      canvas.height * ratio
    );

    // --- Get blob once, reuse for both actions ---
    var blob    = pdf.output("blob");
    var blobUrl = URL.createObjectURL(blob);

    // --- DOWNLOAD: hidden <a> click — never blocked by browsers ---
    if (pdfAction === "download" || pdfAction === "both") {
      var a = document.createElement("a");
      a.href     = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }

    // --- PRINT: open blob in new tab, wait for load, then print ---
    if (pdfAction === "print" || pdfAction === "both") {
      var printUrl = pdf.output("bloburl");
      var win      = window.open(printUrl);
      if (win) {
        win.addEventListener("load", function() {
          win.print();
        });
      }
    }

    // --- Notify Bubble via DOM event ---
    document.dispatchEvent(new CustomEvent("bubble-pdf-generated", {
      detail: { filename: filename, action: pdfAction }
    }));

  });

}