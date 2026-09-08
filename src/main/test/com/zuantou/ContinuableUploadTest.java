package com.zuantou;

import org.junit.jupiter.api.Test;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class ContinuableUploadTest {

    private static final String BASE_URL =
            "http://127.0.0.1:8080/api/file";

    // 你自己填写 JWT
    private static final String TOKEN =
            "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3OTEzNjQyMTl9.HdS5yYjgUnfWS2YYgslnV-nlQkuzjlnaqiWWjtvKCe4";


    /**
     * 测试 initUpload()
     */
    @Test
    public void initUpload() throws Exception {

        String url = BASE_URL + "/initUpload";

        HttpURLConnection connection =
                (HttpURLConnection) new URL(url).openConnection();

        connection.setRequestMethod("GET");
        connection.setRequestProperty("token", TOKEN);
        connection.setDoInput(true);

        System.out.println("HTTP Status: " +
                connection.getResponseCode());

        System.out.println(readResponse(connection));

        connection.disconnect();
    }


    /**
     * 测试 continuableUpload()
     *
     * 这里上传一个本地文件。
     *
     * uploadType:
     * 0 = 第一次上传
     * 1 = 非第一次上传
     */
    @Test
    public void continuableUpload() throws Exception {

        String url = BASE_URL + "/continuableUploadFile";

        String uploadKey =
                "85a9d674-1618-4092-ba13-afdcfe26e196";

        String filePath =
                "E:/resource/pronhub/日本  桥本有菜破坏版AV流出!!制服妹的一天~从早性爱到晚~ (SNIS-648)１７ＭＡＯＡＪ．ＣＯＭ动态图试看120秒_2975822095.mp4";

        String targetPath =
                "E:/codes/IdeaProjects/files/1";

        int uploadType = 0;

        File file = new File(filePath);

        String boundary =
                "----JavaBoundary" + UUID.randomUUID();

        HttpURLConnection connection =
                (HttpURLConnection) new URL(url).openConnection();

        connection.setRequestMethod("POST");
        connection.setRequestProperty("token", TOKEN);

        connection.setRequestProperty(
                "Content-Type",
                "multipart/form-data; boundary=" + boundary
        );

        connection.setDoOutput(true);
        connection.setDoInput(true);

        try (OutputStream output =
                     connection.getOutputStream()) {

            // uploadKey
            writeTextPart(
                    output,
                    boundary,
                    "uploadKey",
                    uploadKey
            );

            // uploadType
            writeTextPart(
                    output,
                    boundary,
                    "uploadType",
                    String.valueOf(uploadType)
            );

            // targetPath
            writeTextPart(
                    output,
                    boundary,
                    "targetPath",
                    targetPath
            );

            // multipartFile
            writeFilePart(
                    output,
                    boundary,
                    "multipartFile",
                    file,
                    "application/octet-stream"
            );

            output.write(
                    ("--" + boundary + "--\r\n")
                            .getBytes(StandardCharsets.UTF_8)
            );
        }

        System.out.println("HTTP Status: " +
                connection.getResponseCode());

        System.out.println(readResponse(connection));

        connection.disconnect();
    }


    /**
     * 测试 getUploadedSize()
     */
    @Test
    public void getUploadedSize() throws Exception {

        String url = BASE_URL + "/getUploadedSize";

        String uploadKey =
                "这里填写uploadKey";

        String boundary =
                "----JavaBoundary" + UUID.randomUUID();

        HttpURLConnection connection =
                (HttpURLConnection) new URL(url).openConnection();

        connection.setRequestMethod("POST");

        connection.setRequestProperty(
                "token",
                TOKEN
        );

        connection.setRequestProperty(
                "Content-Type",
                "multipart/form-data; boundary=" + boundary
        );

        connection.setDoOutput(true);
        connection.setDoInput(true);

        try (OutputStream output =
                     connection.getOutputStream()) {

            writeTextPart(
                    output,
                    boundary,
                    "uploadKey",
                    uploadKey
            );

            output.write(
                    ("--" + boundary + "--\r\n")
                            .getBytes(StandardCharsets.UTF_8)
            );
        }

        System.out.println("HTTP Status: " +
                connection.getResponseCode());

        System.out.println(readResponse(connection));

        connection.disconnect();
    }


    /**
     * 测试 closeUpload()
     */
    public static void closeUpload() throws Exception {

        String url = BASE_URL + "/closeUpload";

        String uploadKey =
                "这里填写uploadKey";

        String boundary =
                "----JavaBoundary" + UUID.randomUUID();

        HttpURLConnection connection =
                (HttpURLConnection) new URL(url).openConnection();

        connection.setRequestMethod("POST");

        connection.setRequestProperty(
                "token",
                TOKEN
        );

        connection.setRequestProperty(
                "Content-Type",
                "multipart/form-data; boundary=" + boundary
        );

        connection.setDoOutput(true);
        connection.setDoInput(true);

        try (OutputStream output =
                     connection.getOutputStream()) {

            writeTextPart(
                    output,
                    boundary,
                    "uploadKey",
                    uploadKey
            );

            output.write(
                    ("--" + boundary + "--\r\n")
                            .getBytes(StandardCharsets.UTF_8)
            );
        }

        System.out.println("HTTP Status: " +
                connection.getResponseCode());

        System.out.println(readResponse(connection));

        connection.disconnect();
    }


    // =========================================================
    // multipart 工具方法
    // =========================================================

    private static void writeTextPart(
            OutputStream output,
            String boundary,
            String name,
            String value
    ) throws IOException {

        String header =
                "--" + boundary + "\r\n" +
                        "Content-Disposition: form-data; name=\"" +
                        name + "\"\r\n" +
                        "\r\n";

        output.write(
                header.getBytes(StandardCharsets.UTF_8)
        );

        output.write(
                value.getBytes(StandardCharsets.UTF_8)
        );

        output.write(
                "\r\n".getBytes(StandardCharsets.UTF_8)
        );
    }


    private static void writeFilePart(
            OutputStream output,
            String boundary,
            String name,
            File file,
            String contentType
    ) throws IOException {

        String header =
                "--" + boundary + "\r\n" +
                        "Content-Disposition: form-data; " +
                        "name=\"" + name + "\"; " +
                        "filename=\"" + file.getName() + "\"\r\n" +
                        "Content-Type: " + contentType + "\r\n" +
                        "\r\n";

        output.write(
                header.getBytes(StandardCharsets.UTF_8)
        );

        try (InputStream input =
                     new FileInputStream(file)) {

            byte[] buffer = new byte[8192];

            int len;

            while ((len = input.read(buffer)) != -1) {
                output.write(buffer, 0, len);
            }
        }

        output.write(
                "\r\n".getBytes(StandardCharsets.UTF_8)
        );
    }


    private static String readResponse(
            HttpURLConnection connection
    ) throws IOException {

        InputStream input;

        if (connection.getResponseCode() >= 400) {
            input = connection.getErrorStream();
        } else {
            input = connection.getInputStream();
        }

        if (input == null) {
            return "";
        }

        StringBuilder result = new StringBuilder();

        try (BufferedReader reader =
                     new BufferedReader(
                             new InputStreamReader(
                                     input,
                                     StandardCharsets.UTF_8
                             )
                     )) {

            String line;

            while ((line = reader.readLine()) != null) {
                result.append(line);
            }
        }

        return result.toString();
    }
}