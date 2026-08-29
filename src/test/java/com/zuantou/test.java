package com.zuantou;

import com.zuantou.pojo.vo.FilesVO;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class test {
    public static void main(String[] args) throws Exception {
        String file = "../files";
        //File f = new File(file);
        //System.out.println(f.length());
        //System.out.println(getFiles(file));
        get();
        //addFile();
    }

    public static FilesVO getFiles(String path){
        File file = new File(path);
        List<FilesVO> list = new ArrayList<>();

        String[] strings = file.list();

        if (strings != null){
            for (String string : strings) {
                list.add(getFiles(path+"/"+string));
            }
        }

        if (list.isEmpty()){
            return new FilesVO(null, file.getName(),file.length(),file.lastModified(),file.isFile());
        }

        return new FilesVO(list, file.getName(),file.length(),file.lastModified(),file.isFile());
    }


    public static void get() throws Exception {

        String targetUrl = "http://127.0.0.1:8080/api/file/getFiles";

        String token = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3OTA1MjI5NTl9.E81JS8oZ2xSOO0W-vmo09NPwsRPi9L1stA4O5hoGgro";

        URL url = new URL(targetUrl);
        HttpURLConnection connection =
                (HttpURLConnection) url.openConnection();

        connection.setRequestMethod("GET");

        // 你的 Filter 读取的是 request.getHeader("token")
        connection.setRequestProperty("token", token);

        connection.setRequestProperty("User-Agent", "Java-Test");

        int responseCode = connection.getResponseCode();

        System.out.println("Status Code: " + responseCode);

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        responseCode >= 400
                                ? connection.getErrorStream()
                                : connection.getInputStream()
                )
        )) {

            StringBuilder response = new StringBuilder();
            String line;

            while ((line = reader.readLine()) != null) {
                response.append(line);
            }

            System.out.println("Response Body: " + response);
        }

        connection.disconnect();
    }
    public static void addFile() throws Exception {

        String targetUrl = "http://127.0.0.1:8080/api/file/addFile";

        // JWT 令牌不用改
        String token = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3OTA1MjI5NTl9.E81JS8oZ2xSOO0W-vmo09NPwsRPi9L1stA4O5hoGgro";

        URL url = new URL(targetUrl);

        HttpURLConnection connection =
                (HttpURLConnection) url.openConnection();

        connection.setRequestMethod("POST");

        // 请求头
        connection.setRequestProperty("token", token);
        connection.setRequestProperty("User-Agent", "Java-Test");
        connection.setRequestProperty(
                "Content-Type",
                "application/json; charset=UTF-8"
        );
        connection.setRequestProperty(
                "Accept",
                "application/json"
        );

        connection.setDoOutput(true);

        // FileDTO
        String jsonBody = """
            {
                "is_file": true,
                "path": "../files/public/document/a.txt"
            }
            """;

        // 发送请求体
        try (OutputStream outputStream = connection.getOutputStream()) {
            outputStream.write(jsonBody.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        }

        int responseCode = connection.getResponseCode();

        System.out.println("Status Code: " + responseCode);

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        responseCode >= 400
                                ? connection.getErrorStream()
                                : connection.getInputStream(),
                        StandardCharsets.UTF_8
                )
        )) {

            StringBuilder response = new StringBuilder();
            String line;

            while ((line = reader.readLine()) != null) {
                response.append(line);
            }

            System.out.println("Response Body: " + response);
        }

        connection.disconnect();
    }

}
