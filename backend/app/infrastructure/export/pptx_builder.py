"""
ResearchMind AI — PowerPoint (PPTX) Presentation Builder
========================================================
Modular OOP presentation builder producing executive-grade 16:9 widescreen slides.
"""

import io
import re
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

from app.domain.interfaces.exporters import IPresentationExporter

# Executive 16:9 Presentation Palette
_BG             = RGBColor(0x0A, 0x0F, 0x1D)
_BG_SECONDARY   = RGBColor(0x06, 0x09, 0x13)
_CARD           = RGBColor(0x11, 0x18, 0x2E)
_CARD_HIGHLIGHT = RGBColor(0x18, 0x22, 0x40)
_CARD_BORDER    = RGBColor(0x1E, 0x29, 0x4B)
_ACCENT         = RGBColor(0x63, 0x66, 0xF1)
_ACCENT2        = RGBColor(0x38, 0xBD, 0xF8)
_ACCENT_EMERALD = RGBColor(0x10, 0xB9, 0x81)
_ACCENT_AMBER   = RGBColor(0xF5, 0x9E, 0x0B)
_ACCENT_VIOLET  = RGBColor(0xA8, 0x55, 0xF7)
_WHITE          = RGBColor(0xF8, 0xFA, 0xFC)
_SUBTEXT        = RGBColor(0x94, 0xA3, 0xB8)
_MUTED          = RGBColor(0x64, 0x74, 0x8B)

_FONT_HEADING = "Segoe UI"
_FONT_BODY    = "Segoe UI"


class PPTXBuilder(IPresentationExporter):
    """Encapsulates PowerPoint generation following clean OOP design."""

    def build_presentation(
        self,
        topic: str,
        slides_data: List[Dict[str, Any]],
        num_slides: int = 8
    ) -> io.BytesIO:
        prs = Presentation()
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)

        total_content_slides = sum(1 for s in slides_data if s.get("type") not in ("title", "thanks"))
        slide_counter = 0

        for idx, slide_data in enumerate(slides_data):
            slide_type = slide_data.get("type", "content")

            if slide_type == "title":
                self._build_title_slide_pro(
                    prs,
                    slide_data.get("title", topic),
                    slide_data.get("subtitle", "Executive Academic Presentation"),
                    slide_data.get("author", "ResearchMind AI")
                )
            elif slide_type == "abstract":
                slide_counter += 1
                self._build_abstract_slide(
                    prs,
                    slide_counter,
                    total_content_slides,
                    slide_data.get("title", "Executive Overview"),
                    slide_data.get("content", ""),
                    topic
                )
            elif slide_type == "intro":
                slide_counter += 1
                self._build_intro_slide(
                    prs,
                    slide_counter,
                    total_content_slides,
                    slide_data.get("title", "Research Context & Scope"),
                    slide_data.get("bullets", []),
                    topic
                )
            elif slide_type in ("two_column", "comparison"):
                slide_counter += 1
                self._build_two_column_slide(
                    prs,
                    slide_counter,
                    total_content_slides,
                    slide_data.get("title", f"Comparative Analysis {slide_counter}"),
                    slide_data.get("col1_title", "Approach A"),
                    slide_data.get("col1_bullets", slide_data.get("bullets", [])[:4] or ["Analysis point 1", "Analysis point 2"]),
                    slide_data.get("col2_title", "Approach B"),
                    slide_data.get("col2_bullets", slide_data.get("bullets", [])[4:8] or ["Advantage 1", "Advantage 2"]),
                    slide_data.get("synthesis", ""),
                    topic
                )
            elif slide_type in ("three_column", "pillars"):
                slide_counter += 1
                b = slide_data.get("bullets", [])
                self._build_three_column_slide(
                    prs,
                    slide_counter,
                    total_content_slides,
                    slide_data.get("title", f"Architecture Pillars {slide_counter}"),
                    slide_data.get("col1_title", "Pillar 1"),
                    slide_data.get("col1_bullets", b[:3] or ["Key component", "Primary function"]),
                    slide_data.get("col2_title", "Pillar 2"),
                    slide_data.get("col2_bullets", b[3:6] or ["Operational layer", "Performance trait"]),
                    slide_data.get("col3_title", "Pillar 3"),
                    slide_data.get("col3_bullets", b[6:9] or ["Analytical outcome", "Verification"]),
                    topic
                )
            elif slide_type in ("process", "workflow"):
                slide_counter += 1
                self._build_process_slide(
                    prs,
                    slide_counter,
                    total_content_slides,
                    slide_data.get("title", f"Methodology Workflow {slide_counter}"),
                    slide_data.get("steps", [{"title": b[:30], "description": b} for b in slide_data.get("bullets", [])[:4]]),
                    topic
                )
            elif slide_type in ("stats", "metrics"):
                slide_counter += 1
                self._build_stats_slide(
                    prs,
                    slide_counter,
                    total_content_slides,
                    slide_data.get("title", f"Performance Metrics {slide_counter}"),
                    slide_data.get("stats", [{"value": f"#{i+1}", "label": b[:30], "description": b} for i, b in enumerate(slide_data.get("bullets", [])[:4])]),
                    topic
                )
            elif slide_type == "conclusion":
                slide_counter += 1
                self._build_conclusion_slide(
                    prs,
                    slide_counter,
                    total_content_slides,
                    slide_data.get("title", "Strategic Conclusions"),
                    slide_data.get("bullets", []),
                    topic
                )
            elif slide_type == "thanks":
                self._build_thanks_slide(
                    prs,
                    slide_data.get("title", "Thank You"),
                    slide_data.get("subtitle", "Questions & Discussion"),
                    topic
                )
            else:
                slide_counter += 1
                self._build_content_slide_pro(
                    prs,
                    slide_counter,
                    total_content_slides,
                    slide_data.get("title", f"Key Findings {slide_counter}"),
                    slide_data.get("bullets", []),
                    slide_data.get("note", ""),
                    topic
                )

        buf = io.BytesIO()
        prs.save(buf)
        buf.seek(0)
        return buf

    def _set_bg(self, slide, prs):
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = _BG

    def _add_rect(self, slide, left, top, width, height, color: RGBColor):
        shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        shape.fill.solid()
        shape.fill.fore_color.rgb = color
        shape.line.fill.background()
        return shape

    def _add_rounded_card(self, slide, left, top, width, height, fill_color=_CARD, border_color=_CARD_BORDER, border_width=1):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color
        if border_color:
            shape.line.color.rgb = border_color
            shape.line.width = Pt(border_width)
        else:
            shape.line.fill.background()
        return shape

    def _add_pill(self, slide, left, top, width, height, text, bg_color=_CARD, border_color=_CARD_BORDER, text_color=_WHITE, font_size=10, bold=True):
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        pill.fill.solid()
        pill.fill.fore_color.rgb = bg_color
        if border_color:
            pill.line.color.rgb = border_color
            pill.line.width = Pt(1)
        else:
            pill.line.fill.background()
        tf = pill.text_frame
        tf.word_wrap = False
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = text
        r.font.name = _FONT_HEADING
        r.font.size = Pt(font_size)
        r.font.bold = bold
        r.font.color.rgb = text_color
        return pill

    def _tf(self, shape, text, size, bold=False, color=None, align=PP_ALIGN.LEFT, italic=False, font_name=_FONT_HEADING):
        tf = shape.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = align
        run = p.add_run()
        run.text = text
        run.font.name = font_name
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = color or _WHITE

    def _format_bullet_runs(self, paragraph, text: str, font_size=12.5, default_color=_WHITE, lead_color=_ACCENT2):
        text = text.strip()
        bold_lead = ""
        rest_text = text

        m_md = re.match(r"^\*\*(.+?)\*\*:?\s*(.*)$", text)
        if m_md:
            bold_lead = m_md.group(1).strip() + ": "
            rest_text = m_md.group(2).strip()
        else:
            parts = text.split(":", 1)
            if len(parts) == 2 and len(parts[0].split()) <= 4 and not parts[0].startswith("http"):
                bold_lead = parts[0].strip() + ": "
                rest_text = parts[1].strip()

        if bold_lead:
            r_lead = paragraph.add_run()
            r_lead.text = bold_lead
            r_lead.font.name = _FONT_HEADING
            r_lead.font.size = Pt(font_size)
            r_lead.font.bold = True
            r_lead.font.color.rgb = lead_color

        if rest_text:
            r_rest = paragraph.add_run()
            r_rest.text = rest_text
            r_rest.font.name = _FONT_BODY
            r_rest.font.size = Pt(font_size)
            r_rest.font.bold = False
            r_rest.font.color.rgb = default_color

    def _add_slide_header_and_footer(self, slide, slide_num: int, total_slides: int, category: str, title: str, topic: str):
        tb_cat = slide.shapes.add_textbox(Inches(0.8), Inches(0.35), Inches(8.0), Inches(0.28))
        self._tf(tb_cat, category.upper(), 9, bold=True, color=_ACCENT2)

        tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.62), Inches(10.5), Inches(0.65))
        self._tf(tb_title, title, 24, bold=True, color=_WHITE)

        if slide_num > 0 and total_slides > 0:
            self._add_pill(
                slide, left=11.6, top=0.55, width=0.95, height=0.34,
                text=f"{slide_num:02d} / {total_slides:02d}",
                bg_color=_CARD, border_color=_CARD_BORDER, text_color=_SUBTEXT, font_size=9.5, bold=True
            )

        self._add_rect(slide, 0.8, 1.35, 11.733, 0.02, _CARD_BORDER)
        self._add_rect(slide, 0.8, 1.35, 1.5, 0.02, _ACCENT)

        clean_topic = topic[:45] if topic else "Academic Intelligence"
        tb_foot_l = slide.shapes.add_textbox(Inches(0.8), Inches(6.95), Inches(6.0), Inches(0.3))
        self._tf(tb_foot_l, f"ResearchMind AI  ·  {clean_topic}", 9, color=_MUTED, font_name=_FONT_BODY)

        tb_foot_r = slide.shapes.add_textbox(Inches(7.5), Inches(6.95), Inches(5.033), Inches(0.3))
        self._tf(tb_foot_r, "Verified & Grounded Academic Intelligence", 9, color=_MUTED, align=PP_ALIGN.RIGHT, font_name=_FONT_BODY)

    def _build_title_slide_pro(self, prs, title: str, subtitle: str, author: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        W, H = 13.333, 7.5

        self._add_rect(slide, 0, 0, 0.18, H, _ACCENT)
        self._add_rounded_card(slide, 0.8, 1.1, 11.733, 5.3, fill_color=_CARD, border_color=_CARD_BORDER)

        self._add_pill(slide, left=1.3, top=1.5, width=3.6, height=0.38, text="✦  EXECUTIVE RESEARCH REPORT", bg_color=RGBColor(0x18, 0x22, 0x48), border_color=_ACCENT, text_color=_ACCENT2, font_size=10)

        tb_title = slide.shapes.add_textbox(Inches(1.3), Inches(2.1), Inches(10.7), Inches(1.8))
        self._tf(tb_title, title, 36, bold=True, color=_WHITE)

        if subtitle:
            tb_sub = slide.shapes.add_textbox(Inches(1.3), Inches(4.0), Inches(10.7), Inches(0.75))
            self._tf(tb_sub, subtitle, 17, color=_ACCENT2)

        self._add_rect(slide, 1.3, 4.85, 4.0, 0.04, _ACCENT)

        date_str = datetime.now().strftime("%B %d, %Y")
        self._add_pill(slide, left=1.3, top=5.2, width=3.0, height=0.45, text=f"👤  {author or 'ResearchMind AI'}", bg_color=_BG, border_color=_CARD_BORDER, text_color=_WHITE, font_size=10.5)
        self._add_pill(slide, left=4.5, top=5.2, width=2.4, height=0.45, text=f"📅  {date_str}", bg_color=_BG, border_color=_CARD_BORDER, text_color=_SUBTEXT, font_size=10.5)
        self._add_pill(slide, left=7.1, top=5.2, width=2.8, height=0.45, text="✓  Grounded with RAG", bg_color=_BG, border_color=RGBColor(0x06, 0x4E, 0x3B), text_color=_ACCENT_EMERALD, font_size=10.5)

    def _build_abstract_slide(self, prs, slide_num: int, total_slides: int, title: str, content: str, topic: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        self._add_slide_header_and_footer(slide, slide_num, total_slides, "Executive Overview", title, topic)

        pillars = [
            ("🎯  Core Objective", "Primary research thesis and technological goals established in this study."),
            ("📊  Method & Framework", "Structured comparative analysis, empirical datasets, and validation protocols."),
            ("⚡  Strategic Impact", "Key benchmarks and verified performance outcomes delivered by this work.")
        ]
        for i, (p_title, p_desc) in enumerate(pillars):
            card_y = 1.6 + i * 1.7
            self._add_rounded_card(slide, 0.8, card_y, 3.6, 1.45, fill_color=_CARD, border_color=_CARD_BORDER)
            self._add_rect(slide, 0.8, card_y, 0.08, 1.45, _ACCENT)

            tb_pt = slide.shapes.add_textbox(Inches(1.05), Inches(card_y + 0.15), Inches(3.2), Inches(0.4))
            self._tf(tb_pt, p_title, 13, bold=True, color=_ACCENT2)

            tb_pd = slide.shapes.add_textbox(Inches(1.05), Inches(card_y + 0.55), Inches(3.2), Inches(0.8))
            self._tf(tb_pd, p_desc, 11, color=_SUBTEXT, font_name=_FONT_BODY)

        self._add_rounded_card(slide, 4.7, 1.6, 7.833, 4.9, fill_color=_CARD, border_color=_CARD_BORDER)

        tb_h = slide.shapes.add_textbox(Inches(5.0), Inches(1.85), Inches(7.2), Inches(0.5))
        self._tf(tb_h, "Strategic Executive Synthesis", 16, bold=True, color=_ACCENT2)

        tb_content = slide.shapes.add_textbox(Inches(5.0), Inches(2.45), Inches(7.2), Inches(2.7))
        tf = tb_content.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = content or "This study synthesizes empirical findings and core technical methodologies into actionable insights."
        p.font.name = _FONT_BODY
        p.font.size = Pt(13.5)
        p.font.color.rgb = _WHITE
        p.line_spacing = 1.35

        self._add_rounded_card(slide, 5.0, 5.35, 7.233, 0.85, fill_color=_BG_SECONDARY, border_color=_ACCENT_EMERALD)
        tb_imp = slide.shapes.add_textbox(Inches(5.2), Inches(5.42), Inches(6.8), Inches(0.7))
        self._tf(tb_imp, "💡 Analytical Takeaway: The empirical findings provide concrete validation for production deployment and architectural scalability.", 11, color=_WHITE, font_name=_FONT_BODY)

    def _build_intro_slide(self, prs, slide_num: int, total_slides: int, title: str, bullets: list[str], topic: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        self._add_slide_header_and_footer(slide, slide_num, total_slides, "Context & Objectives", title, topic)

        coords = [
            (0.8, 1.6, "01 / Research Context", _ACCENT),
            (6.833, 1.6, "02 / Core Problem Statement", _ACCENT2),
            (0.8, 4.15, "03 / Proposed Framework", _ACCENT_EMERALD),
            (6.833, 4.15, "04 / Target Scope & Significance", _ACCENT_AMBER)
        ]
        card_w, card_h = 5.7, 2.35

        for i, (left, top, badge, accent_col) in enumerate(coords):
            self._add_rounded_card(slide, left, top, card_w, card_h, fill_color=_CARD, border_color=_CARD_BORDER)
            self._add_rect(slide, left, top, 0.08, card_h, accent_col)
            self._add_pill(slide, left=left + 0.25, top=top + 0.2, width=2.4, height=0.32, text=badge, bg_color=_BG, border_color=_CARD_BORDER, text_color=accent_col, font_size=9.5)

            bullet_text = bullets[i] if i < len(bullets) else "Comprehensive exploration of domain requirements and methodology."
            tb_b = slide.shapes.add_textbox(Inches(left + 0.25), Inches(top + 0.65), Inches(card_w - 0.5), Inches(1.5))
            tf = tb_b.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            self._format_bullet_runs(p, bullet_text, font_size=12.5, default_color=_WHITE, lead_color=accent_col)

    def _build_two_column_slide(self, prs, slide_num: int, total_slides: int, title: str, col1_title: str, col1_bullets: list[str], col2_title: str, col2_bullets: list[str], synthesis: str, topic: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        self._add_slide_header_and_footer(slide, slide_num, total_slides, "Comparative Analysis", title, topic)

        c_w, c_h = 5.7, 4.25
        self._add_rounded_card(slide, 0.8, 1.6, c_w, c_h, fill_color=_CARD, border_color=_ACCENT)
        self._add_pill(slide, left=1.1, top=1.8, width=3.2, height=0.4, text=col1_title or "Approach A", bg_color=RGBColor(0x18, 0x22, 0x48), border_color=_ACCENT, text_color=_ACCENT, font_size=12)

        tb_b1 = slide.shapes.add_textbox(Inches(1.1), Inches(2.4), Inches(5.1), Inches(3.3))
        tf1 = tb_b1.text_frame
        tf1.word_wrap = True
        for idx, b in enumerate(col1_bullets[:5]):
            p = tf1.paragraphs[0] if idx == 0 else tf1.add_paragraph()
            p.space_after = Pt(8)
            self._format_bullet_runs(p, f"• {b}", font_size=12, default_color=_WHITE, lead_color=_ACCENT2)

        self._add_rounded_card(slide, 6.833, 1.6, c_w, c_h, fill_color=_CARD, border_color=_ACCENT2)
        self._add_pill(slide, left=7.133, top=1.8, width=3.2, height=0.4, text=col2_title or "Approach B", bg_color=RGBColor(0x0C, 0x2A, 0x3E), border_color=_ACCENT2, text_color=_ACCENT2, font_size=12)

        tb_b2 = slide.shapes.add_textbox(Inches(7.133), Inches(2.4), Inches(5.1), Inches(3.3))
        tf2 = tb_b2.text_frame
        tf2.word_wrap = True
        for idx, b in enumerate(col2_bullets[:5]):
            p = tf2.paragraphs[0] if idx == 0 else tf2.add_paragraph()
            p.space_after = Pt(8)
            self._format_bullet_runs(p, f"• {b}", font_size=12, default_color=_WHITE, lead_color=_ACCENT_EMERALD)

        syn_text = synthesis or f"Key Verdict: {col2_title or 'Proposed approach'} provides measurable advantages in production environments with robust trade-offs."
        self._add_rounded_card(slide, 0.8, 6.0, 11.733, 0.75, fill_color=_BG_SECONDARY, border_color=_CARD_BORDER)
        tb_syn = slide.shapes.add_textbox(Inches(1.0), Inches(6.05), Inches(11.3), Inches(0.65))
        tf_s = tb_syn.text_frame
        tf_s.word_wrap = True
        p_s = tf_s.paragraphs[0]
        self._format_bullet_runs(p_s, f"⚖️  **Analytical Synthesis**: {syn_text}", font_size=11.5, default_color=_WHITE, lead_color=_ACCENT2)

    def _build_three_column_slide(self, prs, slide_num: int, total_slides: int, title: str, col1_title: str, col1_bullets: list[str], col2_title: str, col2_bullets: list[str], col3_title: str, col3_bullets: list[str], topic: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        self._add_slide_header_and_footer(slide, slide_num, total_slides, "Architecture & Pillars", title, topic)

        cols = [
            (0.8, col1_title or "Core Engine", col1_bullets, _ACCENT),
            (4.844, col2_title or "Retrieval Layer", col2_bullets, _ACCENT2),
            (8.888, col3_title or "Verification & UI", col3_bullets, _ACCENT_EMERALD)
        ]
        card_w, card_h = 3.645, 5.1

        for i, (left, c_title, c_bullets, acc_col) in enumerate(cols):
            self._add_rounded_card(slide, left, 1.6, card_w, card_h, fill_color=_CARD, border_color=_CARD_BORDER)
            self._add_rect(slide, left, 1.6, card_w, 0.08, acc_col)
            self._add_pill(slide, left=left + 0.3, top=1.85, width=1.5, height=0.3, text=f"PILLAR 0{i+1}", bg_color=_BG, border_color=_CARD_BORDER, text_color=acc_col, font_size=9)

            tb_t = slide.shapes.add_textbox(Inches(left + 0.3), Inches(2.25), Inches(card_w - 0.6), Inches(0.55))
            self._tf(tb_t, c_title, 15, bold=True, color=_WHITE)

            tb_b = slide.shapes.add_textbox(Inches(left + 0.3), Inches(2.9), Inches(card_w - 0.6), Inches(3.6))
            tf = tb_b.text_frame
            tf.word_wrap = True
            for idx, b in enumerate(c_bullets[:5]):
                p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
                p.space_after = Pt(8)
                self._format_bullet_runs(p, f"• {b}", font_size=11.5, default_color=_WHITE, lead_color=acc_col)

    def _build_process_slide(self, prs, slide_num: int, total_slides: int, title: str, steps: list[Any], topic: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        self._add_slide_header_and_footer(slide, slide_num, total_slides, "Sequential Process", title, topic)

        step_items = steps[:4] if steps else [{"title": "Phase 1", "description": "Initialization"}]
        num_steps = len(step_items)
        step_w = (11.733 - (num_steps - 1) * 0.35) / num_steps
        card_h = 4.9
        acc_colors = [_ACCENT, _ACCENT2, _ACCENT_VIOLET, _ACCENT_EMERALD]

        for i, st in enumerate(step_items):
            st_left = 0.8 + i * (step_w + 0.35)
            acc_c = acc_colors[i % len(acc_colors)]

            self._add_rounded_card(slide, st_left, 1.7, step_w, card_h, fill_color=_CARD, border_color=_CARD_BORDER)
            self._add_rect(slide, st_left, 1.7, step_w, 0.08, acc_c)
            self._add_pill(slide, left=st_left + 0.2, top=1.95, width=1.4, height=0.32, text=f"STAGE 0{i+1}", bg_color=_BG, border_color=_CARD_BORDER, text_color=acc_c, font_size=9)

            s_title = st.get("title", f"Stage {i+1}") if isinstance(st, dict) else str(st)
            tb_st_t = slide.shapes.add_textbox(Inches(st_left + 0.2), Inches(2.4), Inches(step_w - 0.4), Inches(0.8))
            self._tf(tb_st_t, s_title, 14, bold=True, color=_WHITE)

            s_desc = st.get("description", "") if isinstance(st, dict) else ""
            tb_st_d = slide.shapes.add_textbox(Inches(st_left + 0.2), Inches(3.3), Inches(step_w - 0.4), Inches(3.1))
            tf = tb_st_d.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = s_desc
            p.font.name = _FONT_BODY
            p.font.size = Pt(11.5)
            p.font.color.rgb = _SUBTEXT
            p.line_spacing = 1.3

            if i < num_steps - 1:
                tb_arrow = slide.shapes.add_textbox(Inches(st_left + step_w), Inches(3.6), Inches(0.35), Inches(0.5))
                self._tf(tb_arrow, "➔", 14, bold=True, color=_ACCENT2, align=PP_ALIGN.CENTER)

    def _build_stats_slide(self, prs, slide_num: int, total_slides: int, title: str, stats: list[Any], topic: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        self._add_slide_header_and_footer(slide, slide_num, total_slides, "Metrics & Performance", title, topic)

        stat_items = stats[:4] if stats else [{"value": "100%", "label": "Key Result", "description": "Measured outcome"}]
        num_items = len(stat_items)
        card_w = (11.733 - (num_items - 1) * 0.35) / num_items
        card_h = 4.9
        acc_colors = [_ACCENT, _ACCENT2, _ACCENT_EMERALD, _ACCENT_AMBER]

        for i, st in enumerate(stat_items):
            st_left = 0.8 + i * (card_w + 0.35)
            acc_c = acc_colors[i % len(acc_colors)]

            self._add_rounded_card(slide, st_left, 1.7, card_w, card_h, fill_color=_CARD, border_color=_CARD_BORDER)
            self._add_rect(slide, st_left, 1.7, card_w, 0.08, acc_c)

            val = st.get("value", "") if isinstance(st, dict) else str(st)
            lbl = st.get("label", "") if isinstance(st, dict) else ""
            desc = st.get("description", "") if isinstance(st, dict) else ""

            tb_val = slide.shapes.add_textbox(Inches(st_left), Inches(2.1), Inches(card_w), Inches(1.1))
            self._tf(tb_val, str(val), 38, bold=True, color=acc_c, align=PP_ALIGN.CENTER)

            tb_lbl = slide.shapes.add_textbox(Inches(st_left + 0.2), Inches(3.2), Inches(card_w - 0.4), Inches(0.65))
            self._tf(tb_lbl, lbl, 14, bold=True, color=_WHITE, align=PP_ALIGN.CENTER)

            if desc:
                tb_desc = slide.shapes.add_textbox(Inches(st_left + 0.2), Inches(3.9), Inches(card_w - 0.4), Inches(2.5))
                tf = tb_desc.text_frame
                tf.word_wrap = True
                p = tf.paragraphs[0]
                p.alignment = PP_ALIGN.CENTER
                p.text = desc
                p.font.name = _FONT_BODY
                p.font.size = Pt(11.5)
                p.font.color.rgb = _SUBTEXT
                p.line_spacing = 1.3

    def _build_content_slide_pro(self, prs, slide_num: int, total_slides: int, title: str, bullets: list[str], note: str = "", topic: str = ""):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        self._add_slide_header_and_footer(slide, slide_num, total_slides, "Key Findings", title, topic)

        bullet_items = bullets[:4] if bullets else ["Comprehensive evaluation of academic evidence and core findings."]
        card_h = 1.08
        gap = 0.18
        start_y = 1.6

        for i, b in enumerate(bullet_items):
            card_y = start_y + i * (card_h + gap)
            self._add_rounded_card(slide, 0.8, card_y, 11.733, card_h, fill_color=_CARD, border_color=_CARD_BORDER)
            self._add_pill(slide, left=1.05, top=card_y + 0.32, width=0.6, height=0.42, text=f"{i+1:02d}", bg_color=_BG, border_color=_ACCENT, text_color=_ACCENT2, font_size=11, bold=True)

            tb_b = slide.shapes.add_textbox(Inches(1.85), Inches(card_y + 0.15), Inches(10.4), Inches(card_h - 0.3))
            tf = tb_b.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            self._format_bullet_runs(p, b, font_size=12.5, default_color=_WHITE, lead_color=_ACCENT2)

        if note:
            self._add_rounded_card(slide, 0.8, 6.0, 11.733, 0.65, fill_color=_BG_SECONDARY, border_color=_CARD_BORDER)
            tb_note = slide.shapes.add_textbox(Inches(1.0), Inches(6.05), Inches(11.3), Inches(0.55))
            self._tf(tb_note, f"💡  Strategic Note: {note}", 10, color=_SUBTEXT, italic=True)

    def _build_conclusion_slide(self, prs, slide_num: int, total_slides: int, title: str, bullets: list[str], topic: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        self._add_slide_header_and_footer(slide, slide_num, total_slides, "Strategic Conclusions", title, topic)

        conc_items = bullets[:3] if bullets else ["Strict grounding verified across tests", "Empirically validated on benchmark dataset", "Deployment ready architecture"]
        card_w = (11.733 - (len(conc_items) - 1) * 0.35) / len(conc_items)

        for i, b in enumerate(conc_items):
            c_left = 0.8 + i * (card_w + 0.35)
            self._add_rounded_card(slide, c_left, 1.7, card_w, 4.0, fill_color=_CARD, border_color=_ACCENT_EMERALD)
            self._add_pill(slide, left=c_left + 0.25, top=1.95, width=0.45, height=0.45, text="✓", bg_color=RGBColor(0x06, 0x4E, 0x3B), border_color=_ACCENT_EMERALD, text_color=_WHITE, font_size=14, bold=True)

            tb_b = slide.shapes.add_textbox(Inches(c_left + 0.25), Inches(2.6), Inches(card_w - 0.5), Inches(2.9))
            tf = tb_b.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            self._format_bullet_runs(p, b, font_size=13, default_color=_WHITE, lead_color=_ACCENT_EMERALD)

        self._add_rounded_card(slide, 0.8, 5.95, 11.733, 0.75, fill_color=_BG_SECONDARY, border_color=_ACCENT_EMERALD)
        tb_imp = slide.shapes.add_textbox(Inches(1.0), Inches(6.05), Inches(11.3), Inches(0.6))
        self._tf(tb_imp, "🚀  Future Outlook & Next Steps: Establish automated continuous integration tests and monitor retrieval precision across broader corpus.", 11, bold=True, color=_WHITE)

    def _build_thanks_slide(self, prs, title: str, subtitle: str, topic: str):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        self._set_bg(slide, prs)
        W, H = 13.333, 7.5

        self._add_rect(slide, 0, 0, 0.18, H, _ACCENT)
        self._add_rounded_card(slide, 1.8, 1.4, 9.733, 4.9, fill_color=_CARD, border_color=_CARD_BORDER)
        self._add_pill(slide, left=4.366, top=1.8, width=4.6, height=0.4, text="RESEARCH COMPLETE  ·  Q&A", bg_color=RGBColor(0x18, 0x22, 0x48), border_color=_ACCENT, text_color=_ACCENT2, font_size=10)

        tb_t = slide.shapes.add_textbox(Inches(2.0), Inches(2.4), Inches(9.333), Inches(1.2))
        self._tf(tb_t, title or "Thank You", 44, bold=True, color=_WHITE, align=PP_ALIGN.CENTER)

        if subtitle:
            tb_sub = slide.shapes.add_textbox(Inches(2.0), Inches(3.6), Inches(9.333), Inches(0.6))
            self._tf(tb_sub, subtitle, 16, color=_ACCENT2, align=PP_ALIGN.CENTER)

        self._add_rect(slide, 4.666, 4.4, 4.0, 0.04, _ACCENT)

        clean_topic = topic or "Grounded Academic Analysis"
        tb_foot = slide.shapes.add_textbox(Inches(2.0), Inches(4.7), Inches(9.333), Inches(0.5))
        self._tf(tb_foot, f"Topic: {clean_topic}  •  Powered by ResearchMind AI", 11, color=_SUBTEXT, align=PP_ALIGN.CENTER)


pptx_builder = PPTXBuilder()


def _generate_ppt_professional(topic: str, slides_data: list[dict]) -> io.BytesIO:
    """Backward-compatible helper function."""
    return pptx_builder.build_presentation(topic, slides_data)
