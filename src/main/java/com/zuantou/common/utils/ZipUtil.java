package com.zuantou.common.utils;

import com.zuantou.common.properties.ErrorCode;
import com.zuantou.pojo.vo.Result;
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

        if (!zipFile.createNewFile()) {
            return Result.error(ErrorCode.EXCEPTION);
        }

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

        String entryName =
                baseDir.toPath()
                        .relativize(file.toPath())
                        .toString()
                        .replace("\\", "/");

        if (file.isDirectory()) {
            ZipArchiveEntry entry =
                    new ZipArchiveEntry(entryName + "/");

            zipOutputStream.putArchiveEntry(entry);

            zipOutputStream.closeArchiveEntry();

            File[] files = file.listFiles();

            if (files == null) {
                return;
            }
            for (File child : files) {
                compress(
                        child,
                        baseDir,
                        zipOutputStream
                );
            }

        } else {
            ZipArchiveEntry entry =
                    new ZipArchiveEntry(
                            file,
                            entryName
                    );
            zipOutputStream.putArchiveEntry(entry);

            try (
                    FileInputStream inputStream =
                            new FileInputStream(file)
            ) {

                byte[] buffer = new byte[8192];

                int len;

                while ((len = inputStream.read(buffer)) != -1) {
                    zipOutputStream.write(
                            buffer,
                            0,
                            len
                    );
                }
            }
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
            if (!targetDir.mkdirs()) {
                return Result.error(ErrorCode.EXCEPTION);
            }
        }

        InputStream inputStream= new FileInputStream(zipFile);

        ZipArchiveInputStream zipInputStream = new ZipArchiveInputStream(inputStream);

        ZipArchiveEntry entry;

        while ((entry = zipInputStream.getNextEntry()) != null) {

            String entryName = entry.getName();

            File targetFile = new File(targetDir, entryName);

            if (entry.isDirectory()) {

                if (!targetFile.mkdirs()) {
                    return Result.error(ErrorCode.EXCEPTION);
                }

                continue;
            }


            File parentDir = targetFile.getParentFile();


            if (!parentDir.exists()) {
                if (!parentDir.mkdirs()) {
                    return Result.error(ErrorCode.EXCEPTION);
                }
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