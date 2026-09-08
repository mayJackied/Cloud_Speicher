package com.zuantou;

import com.zuantou.mapper.file.ShareFileLinkMapper;
import com.zuantou.pojo.ShareFileLink;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class testApp {
    @Autowired
    ShareFileLinkMapper shareFileLinkMapper;

    @Test
    public void test1(){
        ShareFileLink shareFileLink = shareFileLinkMapper.selectById("acaba24e46f14ec0b27657a57f1d175c");
        System.out.println(shareFileLink);
    }

}
