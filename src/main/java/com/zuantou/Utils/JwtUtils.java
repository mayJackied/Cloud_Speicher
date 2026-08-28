package com.zuantou.Utils;

import com.zuantou.config.MeinValProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.Map;

@Component
public class JwtUtils {

    final MeinValProperties properties;

    public String generateJwt(Map<String, Object> claims){
        return Jwts.builder().signWith(SignatureAlgorithm.HS256, properties.getSignKey()).addClaims(claims).setExpiration(new Date(System.currentTimeMillis() + properties.getExpire() * 24 * 60 * 60)).compact();
    }

    public JwtUtils(MeinValProperties properties) {
        this.properties = properties;
    }
}
