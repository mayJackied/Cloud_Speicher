package com.zuantou.utils;

import com.zuantou.config.MyValProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtils {

    final MyValProperties properties;

    public String generateJwt(Map<String, Object> claims) {

        return Jwts.builder()
                .signWith(
                        SignatureAlgorithm.HS256,
                        properties.getSignKey().getBytes(StandardCharsets.UTF_8)
                )
                .addClaims(claims)
                .setExpiration(
                        new Date(
                                System.currentTimeMillis()
                                        + properties.getExpire()
                                        * 24L * 60 * 60 * 1000
                        )
                )
                .compact();
    }

    public Claims parseJWT(String token) {

        return Jwts.parser()
                .setSigningKey(
                        properties.getSignKey().getBytes(StandardCharsets.UTF_8)
                )
                .parseClaimsJws(token)
                .getBody();
    }

    public JwtUtils(MyValProperties properties) {
        this.properties = properties;
    }
}
