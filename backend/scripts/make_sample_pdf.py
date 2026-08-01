"""Generate a sample multi-page PDF with UI/UX design content for testing ChatBook."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

SECTIONS = {
    "Visual Hierarchy": [
        "Visual hierarchy is the arrangement of design elements in order of importance. "
        "By establishing hierarchy you control how the user scans a page and what they notice first.",
        "Size is the most powerful tool for hierarchy. Larger elements attract attention before smaller ones. "
        "Use at most two or three distinct sizes on a single screen to avoid competing focal points.",
        "Color and contrast also create hierarchy. A bright accent on a muted background draws the eye. "
        "Reserve the strongest contrast for the most important action on the page.",
        "Position matters: users read from top-left to bottom-right in Western layouts. "
        "Place the primary call to action where the eye naturally lands first.",
        "Whitespace creates hierarchy by giving important elements breathing room. "
        "An isolated element reads as more important than one crowded by neighbors.",
    ],
    "Typography": [
        "Typography is the craft of arranging type to make language legible, readable, and appealing. "
        "Good type systems use a small set of typefaces with clear roles: headings, body, and captions.",
        "Line length between 45 and 75 characters is most comfortable for body text. "
        "Line height of 1.5 for body copy improves readability on screens.",
        "Font size should be at least 16 pixels for body text on mobile interfaces to reduce eye strain.",
    ],
    "Color": [
        "A limited color palette improves cohesion. Start with one neutral, one primary, "
        "and one accent color, then add semantic colors for success, warning, and error states.",
        "Ensure text meets contrast ratios of at least 4.5:1 for normal text and 3:1 for large text "
        "to satisfy WCAG accessibility guidelines.",
    ],
    "Feedback and States": [
        "Every interactive element needs clear states: hover, pressed, focused, disabled, and loading. "
        "Consistent feedback reduces user errors and builds confidence.",
        "Loading states should appear within 100 milliseconds of an action. "
        "If a task takes longer than one second, show a progress indicator or skeleton screen.",
    ],
    "Navigation": [
        "Navigation should answer three questions at all times: where am I, where can I go, and how do I get back. "
        "Visible, predictable navigation reduces cognitive load.",
    ],
}

PAGES = []
for title, paragraphs in SECTIONS.items():
    PAGES.append((title, paragraphs))

def build(path: str) -> None:
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "H1", parent=styles["Title"], fontSize=24, spaceAfter=18, leading=28
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["BodyText"], fontSize=11, leading=16, spaceAfter=12
    )
    doc = SimpleDocTemplate(path, pagesize=letter, leftMargin=inch, rightMargin=inch, topMargin=inch, bottomMargin=inch)
    story = []
    for title, paragraphs in PAGES:
        story.append(Paragraph(title, title_style))
        for p in paragraphs:
            story.append(Paragraph(p, body_style))
        story.append(Spacer(1, 24))
    doc.build(story)

if __name__ == "__main__":
    build("sample_design_book.pdf")
    print("wrote sample_design_book.pdf")
