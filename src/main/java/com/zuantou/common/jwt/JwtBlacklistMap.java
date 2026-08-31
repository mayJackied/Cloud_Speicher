package com.zuantou.common.jwt;

import com.zuantou.common.properties.MyValProperties;
import com.zuantou.mapper.JwtBlacklistMapper;
import com.zuantou.pojo.JwtBlacklist;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@EnableScheduling
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

    @Scheduled(fixedRate = 60 * 60 * 1000)
    public void removeExpired() {
        blacklists.removeIf(jwtBlacklist -> jwtBlacklist.getExpireTime() <= System.currentTimeMillis());
    }

    public void addJwtBlacklist(String blacklistedJwt){
        JwtBlacklist blacklist = new JwtBlacklist(blacklistedJwt, System.currentTimeMillis() + properties.getExpire() * 24L * 60 * 60 * 1000);
        this.blacklists.add(blacklist);
        jwtBlacklistMapper.insert(blacklist);
    }
}
