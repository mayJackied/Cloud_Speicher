import com.zuantou.common.jwt.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class test {
    @Test
    public void test2(){
        System.out.println(insertedFile(new File("C:/Users/admin/Desktop/aaa/a/a.txt"), new File("C:/Users/admin/Desktop/aaa")));
    }

    private File insertedFile(File oldFile, File targetDir) {
        String originalName = oldFile.getName();
        File newFile;
        if (!originalName.contains("(") && !originalName.contains(")")) {
            newFile = new File(targetDir, insertFileName(oldFile, String.valueOf(1)));
            if (!newFile.exists()) {
                return newFile;
            }
        }
        List<Integer> numberList = new ArrayList<>();
        StringBuilder oldNameSB = new StringBuilder();
        String[] vorC = originalName.split("\\(");
        String[] nachD = originalName.split("\\)");
        for (int i = 0; i < vorC.length - 1; i++) {
            oldNameSB.append(vorC[i]);
        }
        oldNameSB.append(nachD[nachD.length - 1]);

        for (String fileName : Objects.requireNonNull(targetDir.list())) {
            if (fileName.contains("(") && fileName.contains(")")) {
                StringBuilder fileNameSB = new StringBuilder();
                String[] splitC = fileName.split("\\(");

                for (int i = 0; i < splitC.length - 1; i++) {
                    fileNameSB.append(splitC[i]);
                }

                String[] splitD = splitC[splitC.length - 1].split("\\)");
                fileNameSB.append(splitD[splitD.length - 1]);
                if (oldNameSB.compareTo(fileNameSB) != 0) {
                    continue;
                }
                int i;
                try {
                    i = Integer.parseInt(splitD[0]);
                } catch (NumberFormatException e) {
                    continue;
                }
                numberList.add(i);
            }
        }
        numberList.sort((o1,o2)-> o1-o2);
        int number = 1;
        for (Integer i : numberList) {
            if (number != i){
                break;
            }
            number++;
        }
        String insertNumber = String.valueOf(number);

        return new File(targetDir, insertFileName(oldFile, insertNumber));
    }

    private String insertFileName(File oldFile, String insertNumber) {
        StringBuilder newName = new StringBuilder();
        if (oldFile.isFile()) {
            String[] split = oldFile.getName().split("\\.");
            if (split.length == 1 || split[0].isEmpty()) {
                newName.append(oldFile.getName()).append("(").append(insertNumber).append(")");
                return newName.toString();
            }
            if (split.length > 2) {
                for (int i = 0; i < split.length; i++) {
                    if (i == split.length - 1) {
                        newName.append("(").append(insertNumber).append(")").append(".");
                        newName.append(split[split.length - 1]);
                        break;
                    }
                    newName.append(split[i]).append(".");
                }
                return newName.toString();
            }
            newName.append(split[0]).append("(").append(insertNumber).append(")").append(".").append(split[1]);
            return newName.toString();
        }
        newName.append(oldFile.getName()).append("(").append(insertNumber).append(")");
        return newName.toString();
    }

}
