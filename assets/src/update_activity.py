#!/usr/bin/env python3
"""Refresh local activity cards from GitHub's public profile, without a token.

The result is a dated snapshot. Counts describe GitHub activity, not expertise;
the repository count includes forks. Run from any working directory.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path
import re
import tempfile
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo


USER = "haranishi"
CONTRIBUTIONS_URL = f"https://github.com/users/{USER}/contributions"
REPOSITORIES_URL = f"https://github.com/{USER}?tab=repositories"
ASSETS = Path(__file__).resolve().parents[1]
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)


@dataclass(frozen=True)
class Day:
    date: date
    count: int
    level: int


class ContributionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.cells: dict[str, tuple[date, int]] = {}
        self.labels: dict[str, str] = {}
        self.heading = ""
        self.capture: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag in {"td", "rect"} and a.get("data-date"):
            identifier = a.get("id")
            if not identifier or identifier in self.cells:
                raise ValueError("Missing or duplicate contribution cell identifier")
            self.cells[identifier] = (date.fromisoformat(a["data-date"]), int(a["data-level"]))
        elif tag == "tool-tip" and a.get("for"):
            self.capture = a["for"]
            self.labels[self.capture] = ""
        elif tag == "h2" and a.get("id") == "js-contribution-activity-description":
            self.capture = "heading"

    def handle_data(self, data: str) -> None:
        if self.capture == "heading":
            self.heading += data
        elif self.capture:
            self.labels[self.capture] += data

    def handle_endtag(self, tag: str) -> None:
        if tag == "tool-tip" or (tag == "h2" and self.capture == "heading"):
            self.capture = None

    def result(self, observed: date) -> list[Day]:
        heading = re.search(r"([\d,]+)\s+contributions?\s+in the last year", self.heading)
        if not heading:
            raise ValueError("GitHub's rolling-year contribution heading was not found")
        total = int(heading[1].replace(",", ""))
        days = []
        for identifier, (day, level) in self.cells.items():
            label = self.labels.get(identifier, "").strip()
            match = re.match(r"(No|[\d,]+) contributions? on ", label)
            if not match:
                raise ValueError(f"Missing or unrecognized contribution count for {day}")
            count = 0 if match[1] == "No" else int(match[1].replace(",", ""))
            if level not in range(5) or count < 0 or (count == 0) != (level == 0):
                raise ValueError(f"Invalid contribution level/count for {day}")
            days.append(Day(day, count, level))
        days.sort(key=lambda item: item.date)
        if not 350 <= len(days) <= 371:
            raise ValueError(f"Expected a year of activity; found {len(days)} days")
        if any(b.date - a.date != timedelta(days=1) for a, b in zip(days, days[1:])):
            raise ValueError("Contribution dates are missing or duplicated")
        if not timedelta(0) <= observed - days[-1].date <= timedelta(days=1):
            raise ValueError("Contribution calendar is stale or contains future dates")
        if sum(day.count for day in days) != total:
            raise ValueError("Daily counts do not match GitHub's displayed yearly total")
        return days


class RepositoryParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_repositories = False
        self.count: int | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag == "a" and a.get("data-tab-item") == "repositories":
            self.in_repositories = True
        elif tag == "span" and self.in_repositories and "Counter" in a.get("class", "").split():
            value = a.get("title", "")
            if not re.fullmatch(r"[\d,]+", value):
                raise ValueError("GitHub's public repository count is not an exact number")
            count = int(value.replace(",", ""))
            if self.count is not None and self.count != count:
                raise ValueError("GitHub returned conflicting repository counts")
            self.count = count

    def handle_endtag(self, tag: str) -> None:
        if tag == "a":
            self.in_repositories = False


def fetch(url: str) -> str:
    request = Request(url, headers={"User-Agent": "haranishi-profile-snapshot/1.0", "Accept": "text/html"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def element(parent: ET.Element, tag: str, **attrs: object) -> ET.Element:
    return ET.SubElement(parent, f"{{{NS}}}{tag}", {k.replace("_", "-"): str(v) for k, v in attrs.items()})


def text(parent: ET.Element, value: str, x: int | float, y: int | float, size: int = 14, color: str = "#aca6c2", **attrs: object) -> None:
    item = element(parent, "text", x=x, y=y, fill=color, font_size=size, **attrs)
    item.text = value


def render(days: list[Day], repositories: int, observed: date, compact: bool = False) -> bytes:
    width, height = (440, 390) if compact else (880, 358)
    total = sum(day.count for day in days)
    active = sum(day.count > 0 for day in days)
    period = f"{days[0].date.isoformat()} — {days[-1].date.isoformat()}"
    root = ET.Element(f"{{{NS}}}svg", {"viewBox": f"0 0 {width} {height}", "width": str(width), "height": str(height), "role": "img", "aria-labelledby": "activity-title activity-description"})
    element(root, "title", id="activity-title").text = f"{USER} — GitHub activity snapshot"
    element(root, "desc", id="activity-description").text = (
        f"{total:,} contributions across {active} active days from {period}. "
        f"{repositories} public repositories, including forks. "
        f"Observed {observed.isoformat()} in Asia/Tokyo. "
        f"Daily cells use GitHub's reported contribution dates and intensity levels. "
        f"Sources: {CONTRIBUTIONS_URL} and {REPOSITORIES_URL}. "
        "This is a saved snapshot; it does not update automatically."
    )
    defs = element(root, "defs")
    gradient = element(defs, "linearGradient", id="surface", x1="0", y1="0", x2="1", y2="1")
    element(gradient, "stop", offset="0", stop_color="#171426")
    element(gradient, "stop", offset="1", stop_color="#0c101c")
    element(root, "rect", width=width, height=height, rx=18, fill="url(#surface)")
    element(root, "rect", x="0.5", y="0.5", width=width-1, height=height-1, rx="17.5", fill="none", stroke="#302a44")
    group = element(root, "g", font_family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif")
    margin = 24 if compact else 32
    element(group, "circle", cx=margin+4, cy=32, r=4, fill="#a998e8")
    text(group, "BUILDING, DAY BY DAY", margin+18, 37, 13, "#ddd6f1", font_weight=600, letter_spacing="1.5")
    if not compact:
        text(group, "PUBLIC GITHUB ACTIVITY", 848, 37, 11, text_anchor="end", letter_spacing="1.3")
    metrics = [(f"{total:,}", "CONTRIBUTIONS", "last year"), (str(repositories), "PUBLIC REPOS", "including forks"), (str(active), "ACTIVE DAYS", "at least one contribution")]
    if compact:
        positions = [24, 175, 308]
        for x, (value, label, _) in zip(positions, metrics):
            text(group, value, x, 101, 39, "#f1edf9", font_weight=650)
            text(group, label, x, 125, 10, "#c3b7e8", font_weight=600, letter_spacing="0.4")
        text(group, "Last year · Public repos include forks", margin, 153, 12)
        graph_x, graph_y, pitch, cell = 24, 202, 7.4, 5.6
    else:
        positions = [32, 339, 611]
        for x, (value, label, note) in zip(positions, metrics):
            text(group, value, x, 111, 52, "#f1edf9", font_weight=650)
            text(group, label, x, 137, 12, "#c3b7e8", font_weight=600, letter_spacing="1.1")
            text(group, note, x, 158, 12)
        element(group, "path", d="M294 76V155M566 76V155", stroke="#302a44", fill="none")
        graph_x, graph_y, pitch, cell = 64, 218, 14.7, 11.2
        for row, label in [(1, "M"), (3, "W"), (5, "F")]:
            text(group, label, 32, graph_y+row*pitch+9, 10, "#807892")
    first = days[0].date
    sunday = first - timedelta(days=(first.weekday()+1) % 7)
    colors = ["#242231", "#493b70", "#7255a8", "#a385de", "#d3b8ff"]
    for day in days:
        offset = (day.date - sunday).days
        week, weekday = divmod(offset, 7)
        x, y = graph_x+week*pitch, graph_y+weekday*pitch
        if day.date.day == 1:
            # Label every second month on narrow screens to keep the graph readable.
            if not compact or day.date.month % 2 == 1:
                text(group, day.date.strftime("%b"), x, graph_y-13, 10 if compact else 11, "#968caa")
        box = element(group, "rect", x=round(x, 2), y=round(y, 2), width=cell, height=cell, rx=1.8, fill=colors[day.level])
        element(box, "title").text = f"{day.date.isoformat()}: {day.count} contributions"
    if compact:
        text(group, period, margin, 284, 12)
        text(group, "SNAPSHOT", margin, 335, 10, "#c3b7e8", letter_spacing="1.5")
        text(group, f"{observed.isoformat()} · JST", margin, 358, 14, "#e2dbee")
        legend_x, legend_y = 293, 339
    else:
        text(group, period, 32, 335, 11)
        text(group, f"Snapshot {observed.isoformat()} · JST", 848, 335, 11, text_anchor="end")
        legend_x, legend_y = 682, 176
    text(group, "Less", legend_x-31, legend_y+8, 9)
    for index, color in enumerate(colors):
        element(group, "rect", x=legend_x+index*13, y=legend_y, width=9, height=9, rx=1.5, fill=color)
    text(group, "More", legend_x+69, legend_y+8, 9)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)+b"\n"


def atomic_write(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.name}.", delete=False) as temporary:
        temporary.write(payload)
        temporary_path = Path(temporary.name)
    try:
        temporary_path.replace(path)
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ASSETS/"activity.svg", help="desktop SVG output (default: assets/activity.svg)")
    parser.add_argument("--compact-output", type=Path, default=ASSETS/"activity-sm.svg", help="mobile SVG output (default: assets/activity-sm.svg)")
    args = parser.parse_args()
    observed = datetime.now(ZoneInfo("Asia/Tokyo")).date()
    contributions = ContributionParser()
    contributions.feed(fetch(CONTRIBUTIONS_URL))
    days = contributions.result(observed)
    repositories = RepositoryParser()
    repositories.feed(fetch(REPOSITORIES_URL))
    if repositories.count is None:
        raise ValueError("GitHub's public repository count was not found")
    # Finish parsing and rendering both cards before replacing either saved image.
    desktop = render(days, repositories.count, observed)
    compact = render(days, repositories.count, observed, compact=True)
    for path, payload in [(args.output, desktop), (args.compact_output, compact)]:
        atomic_write(path, payload)
        print(f"Wrote {path}")
    print(f"{sum(day.count for day in days):,} contributions; {repositories.count} public repositories; "
          f"{sum(day.count > 0 for day in days)} active days; {days[0].date}..{days[-1].date}; "
          f"snapshot {observed} (Asia/Tokyo)")


if __name__ == "__main__":
    main()
