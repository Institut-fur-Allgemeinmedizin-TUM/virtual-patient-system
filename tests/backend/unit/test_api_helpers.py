from app.api.api import _read_mobile_index_html


def test_read_mobile_index_html_adds_cache_buster(tmp_path):
    index = tmp_path / "index.html"
    index.write_text(
        '<html><script src="/_expo/static/js/web/index-ABC.js"></script></html>',
        encoding="utf-8",
    )

    html = _read_mobile_index_html(str(tmp_path))

    assert "/_expo/static/js/web/index-ABC.js?v=mobile-web-1" in html
