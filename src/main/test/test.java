import com.zuantou.common.jwt.JwtUtils;
import org.junit.jupiter.api.Test;

public class test {
    private final JwtUtils jwtUtils;

    public test(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Test
    public void test1(){
        System.out.println(jwtUtils.sha256("abcdefg"));
    }
}
