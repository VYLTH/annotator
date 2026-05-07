"""
Webhook fanout — fire envelope copies to each project's configured destinations.

Destinations are stored per-project in `annotator_projects.destinations` as
`[{type, url, format}, ...]`. Supported types: slack, discord, linear, http.
Failures are logged but don't fail the original POST.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


async def dispatch(destinations: list[dict[str, Any]], envelope: dict[str, Any]) -> None:
    if not destinations:
        return
    async with httpx.AsyncClient(timeout=8.0) as client:
        for dest in destinations:
            kind = dest.get("type")
            url = dest.get("url")
            if not url:
                continue
            try:
                if kind == "slack":
                    await _slack(client, url, envelope)
                elif kind == "discord":
                    await _discord(client, url, envelope)
                elif kind == "linear":
                    await _linear(client, url, envelope, dest)
                else:
                    await client.post(url, json=envelope)
            except Exception as e:
                logger.warning("fanout failed: %s → %s: %s", kind, url, e)


def _summary(envelope: dict[str, Any]) -> str:
    comment = envelope.get("comment", "")[:300]
    href = envelope.get("url", {}).get("href", "")
    rects = len(envelope.get("rects", []))
    errors = len(envelope.get("errors", []))
    net_errs = len(envelope.get("network", []))
    return f"{comment}\n\n→ {href}\n{rects} rect(s) · {errors} JS errors · {net_errs} network errors"


async def _slack(client: httpx.AsyncClient, url: str, envelope: dict[str, Any]) -> None:
    await client.post(url, json={"text": f"*New annotation*\n{_summary(envelope)}"})


async def _discord(client: httpx.AsyncClient, url: str, envelope: dict[str, Any]) -> None:
    await client.post(url, json={"content": f"**New annotation**\n{_summary(envelope)}"})


async def _linear(client: httpx.AsyncClient, url: str, envelope: dict[str, Any], dest: dict[str, Any]) -> None:
    api_key = dest.get("api_key")
    team_id = dest.get("team_id")
    if not (api_key and team_id):
        return
    title = (envelope.get("comment") or "annotation").splitlines()[0][:80]
    body  = (
        f"{envelope.get('comment','')}\n\n"
        f"**URL:** {envelope.get('url',{}).get('href','')}\n\n"
        f"```json\n{json.dumps({k: envelope[k] for k in ('viewport','env','errors','network','perf') if k in envelope}, indent=2)}\n```"
    )
    query = """
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) { success issue { id identifier } }
      }
    """
    await client.post(
        "https://api.linear.app/graphql",
        headers={"Authorization": api_key, "Content-Type": "application/json"},
        json={"query": query, "variables": {"input": {"title": title, "description": body, "teamId": team_id}}},
    )
