package com.zuantou.common.jwt;

import com.zuantou.common.properties.MyValFileProperties;
import com.zuantou.common.properties.MyValProperties;
import com.zuantou.mapper.DeleteBinFileSourceMapper;
import com.zuantou.mapper.JwtBlacklistMapper;
import com.zuantou.pojo.DeleteBinFileSource;
import com.zuantou.pojo.JwtBlacklist;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@EnableScheduling
@Component
public class JwtBlacklistMap implements CommandLineRunner {
    private final JwtBlacklistMapper jwtBlacklistMapper;
    private final DeleteBinFileSourceMapper deleteBinFileSourceMapper;
    final MyValProperties properties;
    final MyValFileProperties fileProperties;

    public Set<JwtBlacklist> blacklists;

    public JwtBlacklistMap(JwtBlacklistMapper jwtBlacklistMapper, DeleteBinFileSourceMapper deleteBinFileSourceMapper, MyValProperties properties, MyValFileProperties fileProperties) {
        this.jwtBlacklistMapper = jwtBlacklistMapper;
        this.deleteBinFileSourceMapper = deleteBinFileSourceMapper;
        this.properties = properties;
        this.fileProperties = fileProperties;
    }

    @Override
    public void run(String... args) {
        blacklists = new HashSet<>(jwtBlacklistMapper.selectList(null));
    }

    @Scheduled(fixedRate = 60 * 60 * 1000)
    public void removeExpired() {
        if (blacklists == null || blacklists.isEmpty()){
            return;
        }
        List<String> jwtS = new ArrayList<>();
        for (JwtBlacklist blacklist : blacklists) {
            if (blacklist.getExpireTime() <= System.currentTimeMillis()){
                blacklists.remove(blacklist);
                jwtS.add(blacklist.getJwt());
            }
        }
        jwtBlacklistMapper.deleteByIds(jwtS);
    }

    @Scheduled(fixedRate = 60 * 60 * 1000)
    public void removeBinFile() {
        List<String> deleteListIds = new ArrayList<>();
        List<DeleteBinFileSource> deleteBinFileSources = deleteBinFileSourceMapper.selectList(null);
        for (DeleteBinFileSource deleteBinFileSource : deleteBinFileSources) {
            if (deleteBinFileSource.getCreatTime() + fileProperties.getRetainTime() * 24 * 60 * 60 * 1000 > System.currentTimeMillis()) {
                deleteListIds.add(deleteBinFileSource.getNewPath());
            }
        }
        if (deleteListIds.isEmpty()){
            return;
        }
        deleteBinFileSourceMapper.deleteByIds(deleteListIds);
    }

    public void addJwtBlacklist(String blacklistedJwt) {
        JwtBlacklist blacklist = new JwtBlacklist(blacklistedJwt, System.currentTimeMillis() + properties.getExpire() * 24L * 60 * 60 * 1000);
        this.blacklists.add(blacklist);
        jwtBlacklistMapper.insert(blacklist);
    }
}
