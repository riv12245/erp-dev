package com.erp.client

class FakeTransport(queued: List<HttpResponse>) : HttpTransport {
    val calls = mutableListOf<HttpRequest>()
    private val queue = queued.toMutableList()

    override fun execute(request: HttpRequest): HttpResponse {
        calls.add(request)
        return queue.removeAt(0)
    }
}

class InMemoryTokenStore : TokenStore {
    var tokens: AuthTokens? = null
    override fun load(): AuthTokens? = tokens
    override fun save(tokens: AuthTokens) { this.tokens = tokens }
    override fun clear() { tokens = null }
}

fun erpClientQueued(responses: () -> List<HttpResponse>, tokens: AuthTokens? = null): ErpClient {
    val transport = FakeTransport(responses())
    val store = InMemoryTokenStore()
    tokens?.let { store.save(it) }
    return ErpClient("http://localhost:3000", transport, store)
}