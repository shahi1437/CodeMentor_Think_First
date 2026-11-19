import os

from backend.app.core import config


def test_normalize_no_proxy_hosts_unbrackets_ipv6(monkeypatch):
    monkeypatch.setenv("NO_PROXY", "localhost, [::1], example.com")

    config._normalize_no_proxy_hosts()

    assert os.environ["NO_PROXY"] == "localhost,::1,example.com"
