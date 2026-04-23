"""Frigate Config Editor integration.

This integration is intentionally tiny: its only job is to serve the
front-end bundle that ships inside this folder and register it as a
Home Assistant sidebar panel. All the interesting logic lives in the
JavaScript bundle, which talks to Frigate directly from the browser.
"""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

DOMAIN = "frigate_config_editor"

URL_BASE = "/frigate_config_editor_static"
PANEL_URL = "/frigate-config"
PANEL_NAME = "frigate-config-editor"
PANEL_TITLE = "Frigate Config"
PANEL_ICON = "mdi:cog-outline"

JS_FILENAME = "frigate-config-editor.js"


async def async_setup(hass: HomeAssistant, _config: dict) -> bool:
    """Register the static path and the sidebar panel at HA startup."""
    www_dir = Path(__file__).parent / "www"
    js_path = www_dir / JS_FILENAME

    if not js_path.is_file():
        _LOGGER.error(
            "Frigate Config Editor bundle missing at %s. "
            "Reinstall the integration from HACS or rebuild from source.",
            js_path,
        )
        return False

    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(www_dir), cache_headers=False)]
    )

    module_url = f"{URL_BASE}/{JS_FILENAME}"

    async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL.lstrip("/"),
        config={
            "_panel_custom": {
                "name": PANEL_NAME,
                "module_url": module_url,
                "embed_iframe": False,
                "trust_external": False,
                "js_url": module_url,
            }
        },
        require_admin=True,
        update=True,
    )

    _LOGGER.debug("Frigate Config Editor panel registered at %s", PANEL_URL)
    return True


async def async_setup_entry(_hass: HomeAssistant, _entry: ConfigEntry) -> bool:
    """Config-entry path is a no-op; everything is handled by async_setup."""
    return True


async def async_unload_entry(_hass: HomeAssistant, _entry: ConfigEntry) -> bool:
    """Allow HA to unload the (empty) config entry cleanly."""
    return True
