package com.zuantou;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

import java.io.File;
import java.io.IOException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class test {
    public static void main(String[] args) throws IOException {
        Map<String, Object> map = new HashMap<>();
        map.put("sdaf","wafawf");
        String s = Jwts.builder().signWith(SignatureAlgorithm.HS256, "wadad").addClaims(map).setExpiration(new Date(System.currentTimeMillis() + 20 * 1000)).compact();
        System.out.println(s);

    }
}
