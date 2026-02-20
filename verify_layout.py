import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time

async def capture_screenshots():
    # Start the dev server
    proc = subprocess.Popen(["npm", "run", "dev"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(5)  # Wait for server to start

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        resolutions = [
            {"name": "ultrawide", "width": 3440, "height": 1440},
            {"name": "desktop", "width": 1920, "height": 1080},
            {"name": "mobile", "width": 390, "height": 844}
        ]

        for res in resolutions:
            await page.set_viewport_size({"width": res["width"], "height": res["height"]})
            await page.goto("http://localhost:5173")
            await asyncio.sleep(2) # Wait for animations
            await page.screenshot(path=f"screenshot_{res['name']}.png")
            print(f"Captured screenshot_{res['name']}.png")

        await browser.close()

    proc.terminate()

if __name__ == "__main__":
    asyncio.run(capture_screenshots())
