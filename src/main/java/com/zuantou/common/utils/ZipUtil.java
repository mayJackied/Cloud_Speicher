package com.zuantou.common.utils;

import com.zuantou.common.properties.ErrorCode;
import com.zuantou.pojo.Result;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;

import java.io.*;

public class ZipUtil {

    public static Result<Void> zip(String path, String targetDir) throws IOException {
        File sourceFile = new File(path);
        if (targetDir.isEmpty()){
            targetDir = sourceFile.getParent();
        }

        File zipFile;

        if (sourceFile.isFile()) {
            zipFile = new File(targetDir, getFileNameWithoutExtension(sourceFile)+ ".zip" + "/" + sourceFile.getName());
        } else {
            zipFile = new File(targetDir, sourceFile.getName()+".zip");
        }

        zipFile.createNewFile();

        try (
                FileOutputStream fileOutputStream =
                        new FileOutputStream(zipFile);

                ZipArchiveOutputStream zipOutputStream =
                        new ZipArchiveOutputStream(fileOutputStream)
        ) {

            compress(sourceFile, sourceFile.getParentFile(), zipOutputStream);
        }
        return Result.success();
    }


    /**
     * 递归压缩文件/文件夹
     *
     * @param file 当前正在处理的文件/文件夹
     * @param baseDir 基准目录，用来计算 ZIP 内部路径
     * @param zipOutputStream ZIP 输出流
     */
    private static void compress(File file, File baseDir, ZipArchiveOutputStream zipOutputStream) throws IOException {


        // ============================================================
        // 第 1 步：计算文件在 ZIP 中的路径
        // ============================================================

        // 例如：
        //
        // baseDir：
        // E:/resource
        //
        // file：
        // E:/resource/images/a.jpg
        //
        // 最终：
        //
        // entryName：
        // images/a.jpg
        //
        String entryName =
                baseDir.toPath()
                        .relativize(file.toPath())
                        .toString()
                        .replace("\\", "/");


        // ============================================================
        // 第 2 步：判断当前是不是文件夹
        // ============================================================

        if (file.isDirectory()) {


            // ========================================================
            // 第 3 步：创建 ZIP 中的目录 Entry
            // ========================================================

            // 例如：
            //
            // images/
            //
            // 注意最后的 "/"。
            //
            // 这样 ZIP 软件才能知道这是一个目录。
            ZipArchiveEntry entry =
                    new ZipArchiveEntry(entryName + "/");


            // 告诉 ZIP：
            //
            // “我要开始写 images 这个目录了。”
            zipOutputStream.putArchiveEntry(entry);


            // 目录本身没有数据，
            // 所以直接关闭这个 Entry。
            zipOutputStream.closeArchiveEntry();


            // ========================================================
            // 第 4 步：获取文件夹里面的所有文件
            // ========================================================

            File[] files = file.listFiles();

            if (files == null) {
                return;
            }


            // ========================================================
            // 第 5 步：递归处理每一个文件
            // ========================================================

            for (File child : files) {

                // 如果 child 是文件：
                //
                //     直接压缩
                //
                // 如果 child 是文件夹：
                //
                //     再次进入 compress()
                //
                // 这样就可以一直向下遍历。
                compress(
                        child,
                        baseDir,
                        zipOutputStream
                );
            }

        } else {


            // ========================================================
            // 第 6 步：当前是普通文件
            // ========================================================

            // 创建 ZIP Entry。
            //
            // 例如：
            //
            // images/a.jpg
            //
            ZipArchiveEntry entry =
                    new ZipArchiveEntry(
                            file,
                            entryName
                    );


            // 告诉 ZIP：
            //
            // “我要开始写 images/a.jpg。”
            zipOutputStream.putArchiveEntry(entry);


            // ========================================================
            // 第 7 步：打开原始文件
            // ========================================================

            try (
                    FileInputStream inputStream =
                            new FileInputStream(file)
            ) {

                // 8KB 缓冲区
                byte[] buffer = new byte[8192];

                int len;


                // ====================================================
                // 第 8 步：读取原始文件
                // ====================================================

                while ((len = inputStream.read(buffer)) != -1) {

                    // =================================================
                    // 第 9 步：写入 ZIP
                    // =================================================

                    zipOutputStream.write(
                            buffer,
                            0,
                            len
                    );
                }
            }


            // ========================================================
            // 第 10 步：当前文件写完
            // ========================================================

            zipOutputStream.closeArchiveEntry();
        }
    }
    
    public static Result<Void> unzip(String zipPath, String targetDirPath) throws IOException {
        File zipFile = new File(zipPath);
        File targetDir;

        if (targetDirPath.isEmpty()){
            targetDir = zipFile.getParentFile();
        }else {
            targetDir = new File(targetDirPath);
        }

        if (targetDir.isFile()){
            return Result.error(ErrorCode.FILE_ILLEGAL);
        }

        if (!targetDir.exists()) {
            targetDir.mkdirs();
        }

        InputStream inputStream= new FileInputStream(zipFile);

        ZipArchiveInputStream zipInputStream = new ZipArchiveInputStream(inputStream);

        ZipArchiveEntry entry;

        while ((entry = zipInputStream.getNextEntry()) != null) {

            String entryName = entry.getName();

            File targetFile = new File(targetDir, entryName);

            if (entry.isDirectory()) {

                targetFile.mkdirs();

                continue;
            }


            File parentDir = targetFile.getParentFile();


            if (!parentDir.exists()) {
                parentDir.mkdirs();
            }

            OutputStream outputStream = new FileOutputStream(targetFile);

            byte[] buffer = new byte[8192];

            int len;

            while ((len = zipInputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, len);
            }

            outputStream.close();
        }

            zipInputStream.close();

            inputStream.close();

        return Result.success();
    }

    public static String getFileNameWithoutExtension(File file) {
        String fileName = file.getName();

        int index = fileName.lastIndexOf(".");

        if (index <= 0) {
            return fileName;
        }

        return fileName.substring(0, index);
    }
}