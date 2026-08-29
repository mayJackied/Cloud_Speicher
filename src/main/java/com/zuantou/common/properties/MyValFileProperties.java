package com.zuantou.common.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "my.val.file")
public class MyValFileProperties {
    private String path;
    private String publicPath;
}
