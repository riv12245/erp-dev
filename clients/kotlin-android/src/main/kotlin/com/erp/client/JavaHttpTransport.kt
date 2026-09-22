package com.erp.client

import java.net.HttpURLConnection
import java.net.URL

class JavaHttpTransport : HttpTransport {

    override fun execute(request: HttpRequest): HttpResponse {
        val connection = URL(request.path).openConnection() as HttpURLConnection
        connection.requestMethod = request.method
        connection.connectTimeout = 15_000
        connection.readTimeout = 30_000
        request.headers.forEach { (name, value) -> connection.setRequestProperty(name, value) }

        if (request.body != null) {
            connection.doOutput = true
            connection.setRequestProperty(CONTENT_TYPE, "application/json")
            connection.outputStream.use { out ->
                out.write(request.body.toByteArray(Charsets.UTF_8))
            }
        }

        val status = connection.responseCode
        val body = (if (status in 200..299) connection.inputStream else connection.errorStream)
            ?.use { it.bufferedReader(Charsets.UTF_8).readText() }
            .orEmpty()
        return HttpResponse(status, body)
    }
}

private const val CONTENT_TYPE = "Content-Type"