
import com.zuantou.Application;
import com.zuantou.mapper.file.ShareFileLinkMapper;
import com.zuantou.pojo.ShareFileLink;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;


import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class test {


    @Test
    public void test2() {
        System.out.println(insertedFile(new File("C:/Users/admin/Desktop/aaa/a/a.txt"), new File("C:/Users/admin/Desktop/aaa")));
    }

    private File insertedFile(File oldFile, File targetDir) {
        String originalName = oldFile.getName();
        File newFile;
        if (!originalName.contains("(") && !originalName.contains(")")) {
            newFile = new File(targetDir, insertFileName(oldFile, String.valueOf(1)));
            if (!newFile.exists()) {
                return newFile;
            }
        }
        List<Integer> numberList = new ArrayList<>();
        StringBuilder oldNameSB = new StringBuilder();
        String[] vorC = originalName.split("\\(");
        String[] nachD = originalName.split("\\)");
        for (int i = 0; i < vorC.length - 1; i++) {
            oldNameSB.append(vorC[i]);
        }
        oldNameSB.append(nachD[nachD.length - 1]);

        for (String fileName : Objects.requireNonNull(targetDir.list())) {
            if (fileName.contains("(") && fileName.contains(")")) {
                StringBuilder fileNameSB = new StringBuilder();
                String[] splitC = fileName.split("\\(");

                for (int i = 0; i < splitC.length - 1; i++) {
                    fileNameSB.append(splitC[i]);
                }

                String[] splitD = splitC[splitC.length - 1].split("\\)");
                fileNameSB.append(splitD[splitD.length - 1]);
                if (oldNameSB.compareTo(fileNameSB) != 0) {
                    continue;
                }
                int i;
                try {
                    i = Integer.parseInt(splitD[0]);
                } catch (NumberFormatException e) {
                    continue;
                }
                numberList.add(i);
            }
        }
        numberList.sort((o1, o2) -> o1 - o2);
        int number = 1;
        for (Integer i : numberList) {
            if (number != i) {
                break;
            }
            number++;
        }
        String insertNumber = String.valueOf(number);

        return new File(targetDir, insertFileName(oldFile, insertNumber));
    }

    private String insertFileName(File oldFile, String insertNumber) {
        StringBuilder newName = new StringBuilder();
        if (oldFile.isFile()) {
            String[] split = oldFile.getName().split("\\.");
            if (split.length == 1 || split[0].isEmpty()) {
                newName.append(oldFile.getName()).append("(").append(insertNumber).append(")");
                return newName.toString();
            }
            if (split.length > 2) {
                for (int i = 0; i < split.length; i++) {
                    if (i == split.length - 1) {
                        newName.append("(").append(insertNumber).append(")").append(".");
                        newName.append(split[split.length - 1]);
                        break;
                    }
                    newName.append(split[i]).append(".");
                }
                return newName.toString();
            }
            newName.append(split[0]).append("(").append(insertNumber).append(")").append(".").append(split[1]);
            return newName.toString();
        }
        newName.append(oldFile.getName()).append("(").append(insertNumber).append(")");
        return newName.toString();
    }

    @Test
    public void test4() throws RuntimeException, IOException, InterruptedException {
        File sourceFile = new File("E:/codes/IdeaProjects/files/8/222.zip");
        File targetDir = new File("E:/codes/IdeaProjects/files/1");
        FileInputStream inputStream = new FileInputStream(sourceFile);
        FileOutputStream outputStream = new FileOutputStream(new File(targetDir, sourceFile.getName()));

        int byteArrayL = 5 * 1024 * 1024;

        int len;
        byte[] bytes = new byte[byteArrayL];

        long sourceFileL = sourceFile.length();
        long targetFileL = 0L;

        while ((len = inputStream.read(bytes)) != -1) {
            outputStream.write(bytes, 0, len);
            targetFileL = targetFileL + len;
            System.out.println(String.format("%.0f", (double) targetFileL / sourceFileL * 100) + "%");
        }
        System.out.println(targetFileL);
        inputStream.close();
        outputStream.close();
    }

    @Test
    public void test3() throws IOException, InterruptedException {
        File sourceFile = new File("C:/Users/admin/Desktop/aaa/bbb/Kopfschmerzen.flac");
        File targetDir = new File("C:/Users/admin/Desktop/aaa");
        FileInputStream inputStream = new FileInputStream(sourceFile);
        FileOutputStream outputStream = new FileOutputStream(new File(targetDir, sourceFile.getName()));

        int byteArrayL = 5 * 1024 * 1024;

        int len;
        byte[] bytes = new byte[byteArrayL];

        long sourceFileL = sourceFile.length();
        long targetFileL = 0L;

        int i = 0;
        while ((len = inputStream.read(bytes)) != -1) {
            if (i == 7) {
                inputStream.close();
                outputStream.close();
                System.out.println("中断了");
                break;
            }
            outputStream.write(bytes, 0, len);
            targetFileL = targetFileL + len;
            System.out.println(String.format("%.0f", (double) targetFileL / sourceFileL * 100) + "%");
            i++;
        }
        File tempFile = new File(targetDir, sourceFile.getName());
        System.out.println(targetFileL+","+ tempFile.length());

        FileInputStream inputStream2 = new FileInputStream(sourceFile);
        FileOutputStream outputStream2 = new FileOutputStream(new File(targetDir, sourceFile.getName()),true);

        inputStream2.skip(targetFileL);

        while ((len = inputStream2.read(bytes)) != -1) {
            outputStream2.write(bytes, 0, len);
            targetFileL = targetFileL + len;
            Thread.sleep(100);
            System.out.println(String.format("%.0f", (double) targetFileL / sourceFileL * 100) + "%");
        }

        System.out.println(targetFileL);

        inputStream2.close();
        outputStream2.close();
    }



    @Test
    public void http() throws Exception{
        URL url = new URL("http://localhost:8080/api/file/test");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("GET");
        conn.setRequestProperty("token", "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3OTEzNjQyMTl9.HdS5yYjgUnfWS2YYgslnV-nlQkuzjlnaqiWWjtvKCe4");

        System.out.println("Response Code: " + conn.getResponseCode());

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }
        }

        conn.disconnect();
    }
    private String jwt = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxNSwiZXhwIjoxNzkyMzc4NTQyfQ.nb475PxhSKcA0a7y0N4w7MKTRACuXAVYuTdAWbvDPME";
    @Test
    public void  login()throws Exception{
        URL url = new URL("http://8.130.215.175:8080/api/user/login");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);

        String json = """
                {
                    "name": "zuantou",
                    "password": "a1593572684a"
                }
                """;

        try (OutputStream out = conn.getOutputStream()) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
        }

        System.out.println("Response Code: " + conn.getResponseCode());

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }
        }

        conn.disconnect();
    }

    @Test
    public void addFile()throws Exception{
        URL url = new URL("http://8.130.215.175:8080/api/file/addFile");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("token", jwt);
        conn.setDoOutput(true);

        String json = """
                {
                    "is_file": true,
                    "path": "./files/15/test.txt"
                }
                """;

        try (OutputStream out = conn.getOutputStream()) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
        }

        System.out.println("Response Code: " + conn.getResponseCode());

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        conn.getResponseCode() >= 400
                                ? conn.getErrorStream()
                                : conn.getInputStream(),
                        StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }
        }

        conn.disconnect();
    }

}
