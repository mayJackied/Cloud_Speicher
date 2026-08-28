package com.zuantou.utils;

import com.zuantou.pojo.vo.MyFile;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class Util {
    public static MyFile getFiles(String path){
        File file = new File(path);
        List<MyFile> list = new ArrayList<>();

        String[] strings = file.list();

        if (strings != null){
            for (String string : strings) {
                list.add(getFiles(path+"/"+string));
            }
        }

        if (list.isEmpty()){
            return new MyFile(null, file.getName(),file.length(),file.lastModified(),file.isFile());
        }

        return new MyFile(list, file.getName(),file.length(),file.lastModified(),file.isFile());
    }

}
