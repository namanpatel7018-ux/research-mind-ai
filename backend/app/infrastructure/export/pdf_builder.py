"""
ResearchMind AI — ReportLab PDF Document Builder
================================================
Modular OOP document builder producing publication-grade academic PDF reports and exams.
"""

import io
import re
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, PageBreak, KeepTogether,
)
from reportlab.pdfgen import canvas

from app.domain.interfaces.exporters import IPDFExporter

# Brand colours — matched to modern publication standards
_PDF_NAVY    = colors.HexColor("#0F172A")
_PDF_INDIGO  = colors.HexColor("#4338CA")
_PDF_TEAL    = colors.HexColor("#0D9488")
_PDF_TEAL2   = colors.HexColor("#14B8A6")
_PDF_DOT     = colors.HexColor("#0D9488")
_PDF_BLACK   = colors.HexColor("#1E293B")
_PDF_SLATE   = colors.HexColor("#64748B")
_PDF_WHITE   = colors.white
_PDF_BORDER  = colors.HexColor("#CBD5E1")
_PDF_BG_LIGHT= colors.HexColor("#F8FAFC")
_PDF_GREEN   = colors.HexColor("#059669")
_PDF_GREEN_BG= colors.HexColor("#ECFDF5")
_PDF_MUTED   = colors.HexColor("#64748B")
_PDF_RED     = colors.HexColor("#EF4444")
_PDF_VIOLET  = colors.HexColor("#7C3AED")
_PDF_VIOLET2 = colors.HexColor("#A78BFA")
_PDF_TBL_HDR = colors.HexColor("#0F172A")
_PDF_TBL_ROW = colors.HexColor("#F8FAFC")
_PDF_ACCENT  = colors.HexColor("#0D9488")

PAGE_W, PAGE_H = A4
MARGIN = 1.8 * cm


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to compute accurate page count ('Page X of Y') with headers/footers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, total_pages: int):
        self.saveState()
        pw, ph = PAGE_W, PAGE_H
        has_cover = getattr(self, "_has_cover", False)
        doc_label = getattr(self, "_doc_label", "Research Mind AI Document")
        doc_type_label = getattr(self, "_doc_type_label", "Research Intelligence")

        # Top brand accent bars
        self.setFillColor(_PDF_NAVY)
        self.rect(0, ph - 0.45 * cm, pw, 0.45 * cm, fill=1, stroke=0)
        self.setFillColor(_PDF_TEAL)
        self.rect(0, ph - 0.55 * cm, pw, 0.10 * cm, fill=1, stroke=0)

        # Running top header on pages 2+
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(_PDF_SLATE)
            self.drawString(MARGIN, ph - 0.95 * cm, doc_label[:55].upper())
            self.setFont("Helvetica", 7.5)
            self.drawRightString(pw - MARGIN, ph - 0.95 * cm, f"RESEARCH MIND AI  ·  {doc_type_label.upper()}")
            self.setStrokeColor(_PDF_BORDER)
            self.setLineWidth(0.5)
            self.line(MARGIN, ph - 1.08 * cm, pw - MARGIN, ph - 1.08 * cm)

        # Running bottom footer
        if not (has_cover and self._pageNumber == 1):
            self.setStrokeColor(_PDF_BORDER)
            self.setLineWidth(0.5)
            self.line(MARGIN, 1.35 * cm, pw - MARGIN, 1.35 * cm)

            self.setFont("Helvetica", 7.5)
            self.setFillColor(_PDF_SLATE)
            self.drawString(MARGIN, 0.9 * cm, "RESEARCH MIND AI v2.0  ·  ACADEMIC INTELLIGENCE")
            self.drawCentredString(pw / 2, 0.9 * cm, f"Page {self._pageNumber} of {total_pages}")
            self.drawRightString(pw - MARGIN, 0.9 * cm, datetime.now().strftime("%B %d, %Y"))

        # Bottom brand bar
        self.setFillColor(_PDF_INDIGO)
        self.rect(0, 0, pw, 0.25 * cm, fill=1, stroke=0)

        self.restoreState()


def make_numbered_canvas(doc_label: str = "ResearchMind AI Document", doc_type: str = "Research Intelligence", has_cover: bool = False):
    class CustomNumberedCanvas(NumberedCanvas):
        pass
    CustomNumberedCanvas._doc_label = doc_label
    CustomNumberedCanvas._doc_type_label = doc_type
    CustomNumberedCanvas._has_cover = has_cover
    return CustomNumberedCanvas


def format_markdown_inline(text: str) -> str:
    """Escapes XML characters and converts Markdown formatting to ReportLab tags."""
    if not text:
        return ""
    clean = re.sub(r"&(?!([a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)", "&amp;", str(text))
    clean = clean.replace("<", "&lt;").replace(">", "&gt;")
    clean = re.sub(r"`([^`]+)`", r'<font name="Courier" color="#4338CA" size="8.5"><b>\1</b></font>', clean)
    clean = re.sub(r"\*\*\*(.+?)\*\*\*", r"<b><i>\1</i></b>", clean)
    clean = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", clean)
    clean = re.sub(r"\*([^*]+?)\*", r"<i>\1</i>", clean)
    return clean


def get_pdf_styles():
    base = getSampleStyleSheet()

    def _s(name, **kw):
        return ParagraphStyle(name, parent=base["Normal"], **kw)

    return {
        "doc_title": _s("doc_title", fontSize=20, leading=24, textColor=_PDF_NAVY, fontName="Helvetica-Bold", spaceAfter=4),
        "doc_meta": _s("doc_meta", fontSize=8.5, leading=12, textColor=_PDF_SLATE, fontName="Helvetica"),
        "q_label": _s("q_label", fontSize=8, leading=10, textColor=_PDF_INDIGO, fontName="Helvetica-Bold"),
        "q_text": _s("q_text", fontSize=10, leading=14.5, textColor=_PDF_NAVY, fontName="Helvetica-Bold"),
        "ans_label": _s("ans_label", fontSize=8, leading=10, textColor=_PDF_TEAL, fontName="Helvetica-Bold"),
        "code_text": _s("code_text", fontSize=8.5, leading=11.5, textColor=_PDF_NAVY, fontName="Courier"),
        "callout_text": _s("callout_text", fontSize=9.5, leading=14, textColor=_PDF_BLACK, fontName="Helvetica-Oblique", spaceBefore=1, spaceAfter=1),
        "cover_label": _s("cover_label", fontSize=9, leading=12, textColor=_PDF_WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=0),
        "cover_title": _s("cover_title", fontSize=28, leading=34, textColor=_PDF_NAVY, fontName="Helvetica-Bold", alignment=TA_CENTER),
        "cover_subtitle": _s("cover_subtitle", fontSize=13, leading=17, textColor=_PDF_NAVY, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceBefore=4),
        "cover_tagline": _s("cover_tagline", fontSize=10.5, leading=15, textColor=_PDF_TEAL, fontName="Helvetica-Oblique", alignment=TA_CENTER, spaceBefore=6),
        "cover_meta": _s("cover_meta", fontSize=9, leading=13, textColor=_PDF_SLATE, fontName="Helvetica", alignment=TA_CENTER),
        "h1": _s("h1", fontSize=16, leading=20, textColor=_PDF_NAVY, fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=5, keepWithNext=True),
        "h2": _s("h2", fontSize=12.5, leading=16.5, textColor=_PDF_INDIGO, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4, keepWithNext=True),
        "h3": _s("h3", fontSize=10.5, leading=14.5, textColor=_PDF_TEAL, fontName="Helvetica-Bold", spaceBefore=9, spaceAfter=3, keepWithNext=True),
        "body": _s("body", fontSize=9.5, leading=14.5, textColor=_PDF_BLACK, fontName="Helvetica", alignment=TA_LEFT, spaceBefore=2, spaceAfter=4),
        "bullet": _s("bullet", fontSize=9.5, leading=14.5, textColor=_PDF_BLACK, fontName="Helvetica", leftIndent=16, firstLineIndent=-10, spaceBefore=2, spaceAfter=2),
        "numbered": _s("numbered", fontSize=9.5, leading=14.5, textColor=_PDF_BLACK, fontName="Helvetica", leftIndent=20, firstLineIndent=-14, spaceBefore=2, spaceAfter=2),
        "tbl_hdr": _s("tbl_hdr", fontSize=8.5, leading=11.5, textColor=_PDF_WHITE, fontName="Helvetica-Bold", alignment=TA_LEFT),
        "tbl_cell": _s("tbl_cell", fontSize=8.5, leading=11.5, textColor=_PDF_BLACK, fontName="Helvetica", alignment=TA_LEFT),
        "callout": _s("callout", fontSize=9.5, leading=14, textColor=_PDF_BLACK, fontName="Helvetica-Bold", alignment=TA_LEFT, spaceBefore=2, spaceAfter=2),
        "section": _s("section", fontSize=13, leading=17, textColor=_PDF_INDIGO, fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=4, keepWithNext=True),
        "q_number": _s("q_number", fontSize=11, leading=14, textColor=_PDF_INDIGO, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=2),
        "q_text_legacy": _s("q_text_legacy", fontSize=11, leading=15, textColor=_PDF_BLACK, fontName="Helvetica-Bold", spaceBefore=0, spaceAfter=4),
        "option": _s("option", fontSize=10, leading=14, textColor=_PDF_BLACK, fontName="Helvetica", leftIndent=14, spaceBefore=1),
        "answer": _s("answer", fontSize=10, leading=14, textColor=_PDF_GREEN, fontName="Helvetica-Bold", leftIndent=14),
        "summary_title": _s("summary_title", fontSize=15, leading=19, textColor=_PDF_INDIGO, fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=6, keepWithNext=True),
        "summary_body": _s("summary_body", fontSize=9.5, leading=14.5, textColor=_PDF_BLACK, fontName="Helvetica", alignment=TA_LEFT, spaceBefore=2, spaceAfter=4),
        "footer": _s("footer", fontSize=8, leading=10, textColor=_PDF_SLATE, fontName="Helvetica", alignment=TA_CENTER),
        "cover_sub": _s("cover_sub", fontSize=13, leading=18, textColor=_PDF_TEAL, fontName="Helvetica-Oblique", alignment=TA_CENTER),
    }


class PDFBuilder(IPDFExporter):
    """Encapsulates ReportLab PDF generation following clean OOP design."""

    def build_pdf_report(
        self,
        topic: str,
        content: str,
        doc_type: str = "report"
    ) -> io.BytesIO:
        """Builds a publication-grade PDF directly from structured Markdown text."""
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=MARGIN, rightMargin=MARGIN,
            topMargin=MARGIN,  bottomMargin=2.2 * cm,
            title=f"{doc_type.title()}: {topic}",
        )
        styles = get_pdf_styles()
        story = []

        is_chat = doc_type in ("chat_answer", "chat_export", "quick_answer")
        lines_count = len(content.strip().split("\n"))
        is_brief = lines_count < 35
        date_str = datetime.now().strftime("%B %d, %Y")

        if is_chat or is_brief:
            banner_content = [
                [Paragraph(f"<b>RESEARCHMIND AI</b>  ·  {doc_type.replace('_', ' ').upper()}", styles["callout_text"])],
                [Paragraph(format_markdown_inline(topic), styles["h1"])],
                [Paragraph(f"Generated on {date_str}  ·  AI Academic Assistant  ·  Verified Analysis", styles["doc_meta"])],
            ]
            banner_tbl = Table(banner_content, colWidths=[PAGE_W - 2 * MARGIN])
            banner_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                ("LINELEFT", (0, 0), (0, -1), 3.5, _PDF_TEAL),
                ("BOX", (0, 0), (-1, -1), 0.5, _PDF_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]))
            story.append(banner_tbl)
            story.append(Spacer(1, 0.4 * cm))
        else:
            subtitle = f"Generated from {doc_type.replace('_', ' ').title()}"
            self._cover_page_for_report(story, topic, subtitle, "Executive Intelligence Report", doc_type, [f"ResearchMind AI  ·  {date_str}"], styles)

        lines = content.split("\n")
        i = 0
        total_lines = len(lines)

        while i < total_lines:
            line = lines[i].rstrip()
            if not line:
                story.append(Spacer(1, 0.2 * cm))
                i += 1
                continue

            if re.match(r"^(-{3,}|\*{3,}|_{3,})$", line.strip()):
                story.append(HRFlowable(width="100%", thickness=0.6, color=_PDF_BORDER, spaceBefore=4, spaceAfter=6))
                i += 1
                continue

            # Markdown Table
            if line.strip().startswith("|") and line.strip().endswith("|"):
                table_lines = []
                while i < total_lines and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                    table_lines.append(lines[i].strip())
                    i += 1

                table_data = []
                is_header = True
                for t_line in table_lines:
                    cleaned_cells = [c.strip() for c in t_line.strip("|").split("|")]
                    if all(re.match(r"^:?-+:?$", c) for c in cleaned_cells if c):
                        is_header = False
                        continue
                    row_cells = []
                    for c in cleaned_cells:
                        style_to_use = styles["tbl_hdr"] if is_header else styles["tbl_cell"]
                        row_cells.append(Paragraph(format_markdown_inline(c) or "—", style_to_use))
                    table_data.append(row_cells)
                    is_header = False

                if table_data:
                    col_count = max(len(r) for r in table_data)
                    avail_w = PAGE_W - 2 * MARGIN
                    c_w = avail_w / col_count
                    tbl = Table(table_data, colWidths=[c_w] * col_count)
                    t_styles = [
                        ("BACKGROUND", (0, 0), (-1, 0), _PDF_NAVY),
                        ("TEXTCOLOR", (0, 0), (-1, 0), _PDF_WHITE),
                        ("BOX", (0, 0), (-1, -1), 0.5, _PDF_BORDER),
                        ("INNERGRID", (0, 0), (-1, -1), 0.5, _PDF_BORDER),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                    for r_idx in range(1, len(table_data)):
                        if r_idx % 2 == 0:
                            t_styles.append(("BACKGROUND", (0, r_idx), (-1, r_idx), _PDF_BG_LIGHT))
                    tbl.setStyle(TableStyle(t_styles))
                    story.append(KeepTogether([tbl, Spacer(1, 0.25 * cm)]))
                continue

            # Blockquote
            if line.startswith("> "):
                q_text = line[2:].strip()
                q_p = Paragraph(format_markdown_inline(q_text), styles["callout_text"])
                q_table = Table([[q_p]], colWidths=[PAGE_W - 2 * MARGIN])
                q_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#86EFAC")),
                    ("LINELEFT", (0, 0), (0, -1), 3.0, _PDF_GREEN),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]))
                story.append(Spacer(1, 0.15 * cm))
                story.append(q_table)
                story.append(Spacer(1, 0.2 * cm))
                i += 1
                continue

            # Headings
            if line.startswith("### "):
                story.append(Paragraph(format_markdown_inline(line[4:].strip()), styles["h3"]))
                i += 1
                continue
            elif line.startswith("## "):
                h2_text = line[3:].strip()
                story.append(Spacer(1, 0.2 * cm))
                story.append(Paragraph(format_markdown_inline(h2_text), styles["h2"]))
                story.append(HRFlowable(width="100%", thickness=0.6, color=_PDF_TEAL2, spaceAfter=5))
                i += 1
                continue
            elif line.startswith("# "):
                story.append(Spacer(1, 0.25 * cm))
                story.append(Paragraph(format_markdown_inline(line[2:].strip()), styles["h1"]))
                story.append(HRFlowable(width="100%", thickness=1.0, color=_PDF_TEAL, spaceAfter=8))
                i += 1
                continue

            # Lists
            if line.startswith("- ") or line.startswith("* "):
                bullet_html = format_markdown_inline(line[2:].strip())
                story.append(Paragraph(f"• {bullet_html}", styles["bullet"]))
                i += 1
                continue
            elif re.match(r"^\d+\.\s+", line):
                m = re.match(r"^(\d+\.)\s+(.+)$", line)
                story.append(Paragraph(f"<b>{m.group(1)}</b> {format_markdown_inline(m.group(2))}", styles["numbered"]))
                i += 1
                continue

            # Body
            story.append(Paragraph(format_markdown_inline(line), styles["body"]))
            i += 1

        canvas_cls = make_numbered_canvas(
            doc_label=f"{doc_type.replace('_', ' ').title()}: {topic}",
            doc_type=doc_type.replace('_', ' ').title(),
            has_cover=not (is_chat or is_brief),
        )
        doc.build(story, canvasmaker=canvas_cls)
        buf.seek(0)
        return buf

    def _cover_page_for_report(self, story, title: str, subtitle: str, tagline: str, doc_type: str, meta_lines: list, styles: dict):
        story.append(Spacer(1, 0.55 * cm))
        story.append(Spacer(1, 3.5 * cm))
        story.append(Paragraph(title, styles["cover_title"]))
        if subtitle:
            story.append(Paragraph(subtitle, styles["cover_subtitle"]))
        if tagline:
            story.append(Spacer(1, 0.3 * cm))
            story.append(Paragraph(f'"{tagline}"', styles["cover_tagline"]))
        story.append(Spacer(1, 1.8 * cm))
        story.append(HRFlowable(width="70%", thickness=0.6, color=_PDF_SLATE, hAlign="CENTER", spaceAfter=12))
        for m in meta_lines:
            story.append(Paragraph(m, styles["cover_meta"]))
        story.append(PageBreak())

    def build_quiz_pdf(self, topic: str, questions: list, summary: str, include_answers: bool) -> io.BytesIO:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=MARGIN, rightMargin=MARGIN,
            topMargin=1.6 * cm,  bottomMargin=1.8 * cm,
            title=f"Quiz Assessment: {topic}",
        )
        styles = get_pdf_styles()
        story = []
        CONTENT_W = PAGE_W - 2 * MARGIN
        date_now = datetime.now().strftime("%B %d, %Y")
        clean_topic = format_markdown_inline(topic)

        # Header Banner
        hdr_table = Table([
            [Paragraph("RESEARCH MIND AI  ·  ACADEMIC EXAMINATION &amp; ASSESSMENT", styles["doc_meta"]), Paragraph(f"DATE: {date_now}", styles["doc_meta"])],
            [Paragraph(f"Quiz Assessment: {clean_topic}", styles["doc_title"]), ""],
            [Paragraph(f"Official assessment comprising {len(questions)} multiple-choice questions for evaluation.", styles["doc_meta"]), ""]
        ], colWidths=[CONTENT_W * 0.72, CONTENT_W * 0.28])
        hdr_table.setStyle(TableStyle([
            ("SPAN", (0, 1), (1, 1)),
            ("SPAN", (0, 2), (1, 2)),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(hdr_table)
        story.append(Spacer(1, 0.2 * cm))

        # Instructions
        story.append(Paragraph(f"Total questions: {len(questions)}. Complete all questions.", styles["body"]))
        story.append(Spacer(1, 0.25 * cm))

        # Questions
        for idx, q in enumerate(questions, start=1):
            q_text = format_markdown_inline(q.get("question", ""))
            story.append(Paragraph(f"<b>Q{idx}. {q_text}</b>", styles["h3"]))
            for opt_idx, opt in enumerate(q.get("options", [])):
                lbl = ["A", "B", "C", "D"][opt_idx] if opt_idx < 4 else str(opt_idx)
                is_corr = (lbl == q.get("correct")) and include_answers
                style = styles["answer"] if is_corr else styles["body"]
                story.append(Paragraph(f"[{lbl}] {format_markdown_inline(opt)}", style))
            if include_answers and q.get("explanation"):
                story.append(Paragraph(f"<i>Explanation: {format_markdown_inline(q.get('explanation'))}</i>", styles["doc_meta"]))
            story.append(Spacer(1, 0.25 * cm))

        canvas_cls = make_numbered_canvas(doc_label=f"Quiz: {topic}", doc_type="Academic Assessment", has_cover=False)
        doc.build(story, canvasmaker=canvas_cls)
        buf.seek(0)
        return buf


    build_markdown_pdf = build_pdf_report


pdf_builder = PDFBuilder()


def _build_markdown_pdf(topic: str, content: str, doc_type: str = "report") -> io.BytesIO:
    """Backward-compatible helper function."""
    return pdf_builder.build_pdf_report(topic, content, doc_type)
