package com.zuantou.common.jwt;

import com.zuantou.common.properties.MyValProperties;
import com.zuantou.mapper.user.JwtBlacklistMapper;
import com.zuantou.pojo.JwtBlacklist;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class JwtBlacklistMap implements CommandLineRunner {
    private final JwtBlacklistMapper jwtBlacklistMapper;
    final MyValProperties properties;

    public Set<JwtBlacklist> blacklists;

    public JwtBlacklistMap(JwtBlacklistMapper jwtBlacklistMapper, MyValProperties properties) {
        this.jwtBlacklistMapper = jwtBlacklistMapper;
        this.properties = properties;
    }

    @Override
    public void run(String... args) {
        blacklists = new HashSet<>(jwtBlacklistMapper.selectList(null));
    }

    public void addJwtBlacklist(String blacklistedJwt) {
        JwtBlacklist blacklist = new JwtBlacklist(blacklistedJwt, System.currentTimeMillis() + properties.getExpire() * 24L * 60 * 60 * 1000);
        this.blacklists.add(blacklist);
        jwtBlacklistMapper.insert(blacklist);
    }
}
